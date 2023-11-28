import path from "node:path";
import os from "os";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

import { ToolboxAPI } from "@iter-ai/toolbox-macos-integration";

// Get the path to the iMessage database
export const chatDB = path.join(os.homedir(), "/Library/Messages/chat.db");

type Chat = {
  chatIdentifier: string;
  participantIdentifiers: string[];
  displayName?: string;
};

type Message = {
  chatIdentifier: string;
  text: string;
  date: string;
  senderIsMe: boolean;
  isRead?: boolean; // null if senderIsMe
  senderIdentifier?: string; // null if senderIsMe
};
const list_chats_sql = `
    WITH ranked_messages AS (SELECT message.rowid,
                                    chat_message_join.chat_id,
                                    message.date,
                                    ROW_NUMBER() OVER (PARTITION BY chat_message_join.chat_id ORDER BY message.date DESC) as rn
                             FROM message
                                      JOIN chat_message_join ON message.rowid = chat_message_join.message_id)
    SELECT chat.chat_identifier,
           chat.display_name,
           group_concat(handle.id, ',') as handle_ids
    FROM chat
             JOIN chat_handle_join chj ON chj.chat_id = chat.rowid
             JOIN handle ON handle.rowid = chj.handle_id
             JOIN chat_message_join cmj ON cmj.chat_id = chat.rowid
             JOIN message ON message.rowid = cmj.message_id
             JOIN ranked_messages ON ranked_messages.chat_id = cmj.chat_id AND ranked_messages.rowid = message.rowid
    WHERE ranked_messages.rn = 1
    GROUP BY chat.chat_identifier
    ORDER BY message.date DESC
`;

const list_messages_sql = `
    SELECT text,
           attributedBody,
           datetime(message.date / 1000000000 + strftime("%s", "2001-01-01"), "unixepoch", "localtime") AS date,
           chat.chat_identifier,
           handle.id                                                                                    AS sender_identifier,
           message.is_from_me,
           message.is_read
    FROM message
        JOIN chat_message_join cmj
    on cmj.message_id = message.ROWID
        JOIN chat on chat.ROWID = cmj.chat_id
        LEFT JOIN handle on message.handle_id = handle.ROWID
`;

/**
 * Asynchronously fetches a list of iMessage chats, most recently used chat at front of list.
 *
 * @param {Object} params - The parameters for fetching chats.
 * @param {number} [params.limit=20] - The maximum number of chats to return. Defaults to 20. (Optional)
 *
 * @returns {Promise<Chat[]>} A promise that resolves to an array of Chat objects.
 */
export const listChats: ToolboxAPI.Handler = {
  endpointDefinition: {
    name: "imessage.listChats",
    description:
      "List user's message chats, with most recently used chat at front of list. This returns the chatIdentifiers of each chat (e.g., phone number or emails). You might need to check the contact book to figure out the correspondence between contact names and chatIdentifiers.",
    parameters: {
      limit: {
        required: false,
        description: "The maximum number of chats to return. Defaults to 20.",
        type: "number",
      },
    },
    responseType: "object",
  },
  handler: async ({ limit = 20 }: { limit?: number }) => {
    let sql = list_chats_sql;
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }
    const rows = await imessageExecuteSQL({ sql });

    return rows.map((row) => {
      const uniqueHandleIds = [...new Set(row.handle_ids.split(","))] as string[];
      return {
        chatIdentifier: row.chat_identifier,
        participantIdentifiers: uniqueHandleIds,
        displayName: row.display_name,
      } satisfies Chat;
    });
  },
};

/**
 * Private function used to parse the text out from the serialized attributedBody blob.
 * It was converted using GPT-4 from https://github.com/dsouzarc/iMessageAnalyzer/pull/21
 */
function parseAttributedBody({ attributedBody }: { attributedBody: Buffer }): string {
  // Convert blob to Buffer
  const buffer = Buffer.from(attributedBody);

  // Convert Buffer to hex string
  let hexString = buffer.toString("hex");

  // Perform string manipulations
  let startIndex = hexString.indexOf("4e53537472696e67");
  if (startIndex !== -1) {
    hexString = hexString.substring(startIndex + 16); // 16 = length of '4e53537472696e67'
    hexString = hexString.substring(12);
  }
  let endIndex = hexString.indexOf("8684");
  if (endIndex !== -1) {
    hexString = hexString.substring(0, endIndex);
  }

  // Convert hex string back to Buffer
  const newData = Buffer.from(hexString, "hex");

  // Decode Buffer to string
  let result = newData.toString("utf8");

  // Remove �\x00, b\x02, or +\x01 from the beginning and a space at the end of the string
  result = result.replace(/^(\uFFFD\x00|b\x02|\+\x01)/, "").replace(/\s$/, "");

  return result;
}

/**
 * Asynchronously fetches a list of iMessage messages, newest message at front of the list.
 *
 * @param {Object} params - The parameters for the message fetch.
 * @param {string} [params.chatIdentifier] - The identifier of the chat to fetch messages from. (Optional)
 * @param {boolean} [params.isSentByMe] - A flag indicating whether the messages to fetch were sent by the user. (Optional)
 * @param {string} [params.senderIdentifier] - The identifier of the sender of the messages to fetch. (Optional)
 * @param {string} [params.afterDate] - The date after which to fetch messages. (Optional)
 * @param {number} [params.limit=100] - The maximum number of messages to fetch. Defaults to 100. (Optional)
 *
 * @returns {Promise<Message[]>} A promise that resolves to an array of Message objects.
 */

export const listMessages: ToolboxAPI.Handler = {
  endpointDefinition: {
    name: "imessage.listMessages",
    description: "List user's messages, with newest message at front of the list.",
    parameters: {
      chatIdentifier: {
        required: false,
        description:
          "The identifier of the chat to fetch messages from. This can be obtained from the listChats tool. For a DM, it is someone's phone number (formatted with country code, like +1XXXXXXXXXX) or otherwise email; for a group chat, the identifier is special and can only be found through listChats.",
        type: "string",
      },
      isSentByMe: {
        required: false,
        description: "A flag indicating whether the messages to fetch were sent by the user.",
        type: "boolean",
      },
      senderIdentifier: {
        required: false,
        description:
          "The identifier of the sender of the messages to fetch. This can be obtained from the listChats tool, as a senderIdentifier. It is someone's phone number (formatted with country code, like +1XXXXXXXXXX) or otherwise email, not a name.",
        type: "string",
      },
      afterDate: {
        required: false,
        description: "The date after which to fetch messages.",
        type: "string",
      },
      limit: {
        required: false,
        description: "The maximum number of messages to fetch. Defaults to 100.",
        type: "number",
      },
    },
    responseType: "object",
  },
  handler: async ({
    chatIdentifier,
    isSentByMe,
    senderIdentifier,
    afterDate,
    limit = 100,
  }: {
    chatIdentifier?: string;
    isSentByMe?: boolean;
    senderIdentifier?: string;
    afterDate?: string;
    limit?: number;
  }) => {
    let sql = list_messages_sql;

    const conditions = [];
    if (chatIdentifier) {
      conditions.push(`chat_identifier = '${chatIdentifier}'`);
    }
    if (isSentByMe !== undefined) {
      conditions.push(`is_from_me = '${isSentByMe ? 1 : 0}'`);
    }
    if (senderIdentifier) {
      conditions.push(`sender_identifier = '${senderIdentifier}'`);
    }
    if (afterDate) {
      const dateInt = (Date.parse(afterDate) - Date.parse("2001-01-01")) * 1000000;
      conditions.push(`date >= '${dateInt}'`);
    }

    if (conditions.length) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    sql += " ORDER BY date DESC";
    if (limit) {
      sql += ` LIMIT ${limit}`;
    }
    const rows = await imessageExecuteSQL({ sql });

    return rows.map((row) => {
      let text: string | null = row.text;
      const hasAttachment = row.cache_has_attachments === 1;

      // Check if the message has an attachment and no text, then assign a default text
      // If the text is null and the message has an attributed body, parse the attributed body
      if (hasAttachment && !text) {
        text = "<Message with no text, but an attachment.>";
      }
      if (text === null && row.attributedBody !== null) {
        try {
          text = parseAttributedBody({ attributedBody: Buffer.from(row.attributedBody) });
        } catch (e) {}
      }

      const sender = row.is_from_me ? undefined : row.sender_identifier;
      const isRead = row.is_from_me ? undefined : Boolean(row.is_read);
      return {
        chatIdentifier: row.chat_identifier,
        text: text!,
        date: row.date,
        senderIsMe: row.is_from_me,
        isRead: isRead,
        senderIdentifier: sender,
      } satisfies Message;
    });
  },
};

/**
 * Executes a SQL query on the iMessage database.
 *
 * @param {Object} params - The parameters for the SQL execution.
 * @param {string} params.sql - The SQL query to execute.
 *
 * @returns {Promise<any[]>} A promise that resolves to an array of results from the SQL query.
 */
export async function imessageExecuteSQL({ sql }: { sql: string }): Promise<any[]> {
  const db = await open({
    filename: chatDB,
    driver: sqlite3.Database,
    mode: sqlite3.OPEN_READONLY,
  });
  return await db.all(sql);
}

export const executeSQL: ToolboxAPI.Handler = {
  endpointDefinition: {
    name: "imessage.executeSQL",
    description: "Execute SQL on the iMessage database. This only allows read-only queries.",
    parameters: {
      sql: {
        required: true,
        description: "The SQL query to execute.",
        type: "string",
      },
    },
    responseType: "object",
  },
  handler: async ({ sql }: { sql: string }) => {
    return await imessageExecuteSQL({ sql });
  },
};
