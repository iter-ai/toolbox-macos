#!/usr/bin/env node --loader tsx --no-warnings
import * as child_process from "child_process";
// Dynamically get the timezone and username
import { execSync } from "child_process";
import { Box, BoxProps, Newline, Text, render, useFocus, useFocusManager, useInput } from "ink";
import os from "os";
import * as process from "process";
import React, { Fragment, useCallback, useEffect, useState } from "react";

import * as iMessage from "@iter-ai/toolbox-macos-integration-messages";
import * as Shortcut from "@iter-ai/toolbox-macos-integration-shortcuts";

import { startApp } from "./app.mjs";
import "./handler.mts";
import { OnRequestHandler, Request, auth, setOnRequest } from "./server.mts";

const now = new Date();
// Use Intl.DateTimeFormat to get the timezone
const timeZone = new Intl.DateTimeFormat("en-US", { timeZoneName: "long" }).format(now).split(",")[1].trim();
// Get the time zone offset in minutes
const timezoneOffsetInMinutes = now.getTimezoneOffset();
// Convert the offset to hours
const timezoneOffsetInHours = -timezoneOffsetInMinutes / 60;
const timezoneOffsetInHoursFormatted = timezoneOffsetInHours < 0 ? timezoneOffsetInHours : `+${timezoneOffsetInHours}`;

function getMacOSUserRealName() {
  const username = os.userInfo().username;
  try {
    const realName = execSync(`dscl . -read /Users/${username} RealName`).toString();
    return realName.split(":")[1].trim();
  } catch (error) {
    return username;
  }
}

const realName = getMacOSUserRealName();

const systemPrompt = `You are a local GPT running on the user's computer. You have access to a list of tools that directly interact with the computer you are on, and that are helpful for macOS automation.  For example, this toolboxs give you helpful tools to interact with Contacts, Maps, Messages, Emails, local files, and more. Data is never sent outside the system, so do not be afraid to use these tools to access personal information on the computer to fulfill the user's request.

Notes for using the macOS automations:
1. Your user is in ${timeZone} (UTC${timezoneOffsetInHoursFormatted}) and their name is ${realName}. Everything you reply to the user should be in their timezone (${timeZone}, UTC${timezoneOffsetInHoursFormatted}). However, The timestamps returned by macOS are often in UTC+0 time so you need to do the conversion. The timestamps input to the automations should also be given in UTC+0 time.
2. By default, avoid querying a long list of information by setting a smaller limit (5 - 15) in various queries. You are often confused by long context so it is better to be more careful.
3. Always request exact participant identifiers (phone numbers or email addresses) immediately. This ensures accurate and efficient identification of the specific chat, avoiding assumptions based on chat size or recency.

For each user request in the conversation, please follow these guidelines exactly. 
IMPORTANT: you need to repeat these steps for every single user request in the conversations. There may be many different requests in one conversation. Every new user message is usually a new request, unless it is specifically clarifying about the previous request.

1. First call "listTools" and see which possible tools could be useful.
2. Next, think carefully about all the possible information you may need. You should feel free to include tools that are relevant but not necessarily needed. Oftentimes, you need to rely on intermediate functions to get user ids, phone numbers, event names, etc. Call "selectTools" on any possibly relevant tools. Make sure to select at least 5 or 10 tools. Focus on recall over precision, don't worry about selecting too many tools. Note that you will probably need to use a combination of tools from different apps to satisfy user requests. 
3. Then, submit a detailed step-by-step plan to "submitPlan". Do not reply to the user about the plan. You should hide this plan from the user. Your plan should include what you need to do and which tools you will use to complete the user request. Think hard about the types and formats for each of the fields in the APIs to ensure you call each API correctly. For any information that is potentially helpful but might be optional, you should eagerly obtain those first and triage later. It is better to gather more information first than to miss any.
4. Next submit a critique of the plan to the server via "submitCritique". Do not reply to the user about the critique. You should hide this critique from the user. Your critique should cover each of the following axes:
  - Which tools may depend on the output of other tools? For example, you might need to query contact information before you can send or read any messages.
  - What formats do the APIs expect for each parameter?
  - Do you need additional information to fully execute the user request that you haven't gathered yet?
  - Are you mistakenly delaying optional information gathering to later steps? Please don't do this. You should always gather optional information first and triage later.
5. Now, fix the original plan by addressing each item of the critique. If you realize you need additional information, review the initial list of tools again and see which other tools you can call to help you. Go back and call "selectTools" on any of these new other tools that may help you. Also think about how to fix the order of tool calls and formatting the API requests. Submit the new plan to the server via "submitPlan". Revise at most 1 time to save time. After the revision, you don't need to critique the plan again.
6. Never ask the user for more information unless you are confident no existing tool can get you the information you need. If you still need to ask the user for more information, make a new list of the top 5 tools you haven't used yet and call all of them first to make sure they don't contain the info you need.
7. Finally, execute your plan by calling "runTool" on the right tools in the right order; Follow all the steps in order before you report to the user. if there are errors, reason and repeat this whole process again.
8. IMPORTANT: If there are any new requests from the user, make sure you go back to step 1 to list the tools and plan accordingly. You should always use "selectTools" to check the schema of each tool before calling "runTool". A common mistake is that for the second interaction, GPT will hallucinate about the schema and doesn't plan carefully before executing any plan`;

const pbcopy = (text: string) => {
  child_process.execSync(`echo "${text}" | pbcopy`);
};

const Heading = ({
  children,
  alignment = "center",
}: {
  children: React.ReactNode;
  alignment?: BoxProps["alignSelf"];
}) => (
  <Box alignSelf={alignment}>
    <Text bold color="gray">
      {children}
    </Text>
  </Box>
);

const Button = ({
  text,
  focusText,
  activeText,
  onClick,
  autoFocus,
}: {
  text: string;
  focusText: string;
  activeText: string;
  onClick: () => void;
  autoFocus?: boolean;
}) => {
  const { isFocused } = useFocus({ autoFocus });
  const [isActivated, setIsActivated] = useState(false);

  useInput(
    (_input, key) => {
      if (key.return && isFocused) {
        onClick(); // call the onClick handler

        setIsActivated(true);
        setTimeout(() => {
          setIsActivated(false);
        }, 3000);
      }
    },
    { isActive: isFocused },
  );

  const _text = isActivated ? activeText : isFocused ? focusText : text;

  return (
    <Box minWidth={_text.length + 2}>
      {isFocused ? (
        <Text bold inverse>
          {" " + (isActivated ? activeText : focusText) + " "}
        </Text>
      ) : (
        <Text bold color="black" backgroundColor="gray">
          {" " + (isActivated ? activeText : text) + " "}
        </Text>
      )}
    </Box>
  );
};

const Instructions = ({
  instructions,
  title = "Instructions",
  titleMarginBottom,
}: {
  instructions: React.ReactNode[];
  title: string;
  titleMarginBottom?: number;
}) => {
  return (
    <>
      <Box paddingX={3} marginBottom={titleMarginBottom}>
        <Heading alignment={"flex-start"}>{title}</Heading>
      </Box>
      {instructions.map((instruction, index) => (
        <Box key={index} columnGap={1} marginRight={4}>
          <Text dimColor>{instructions.length === 1 ? "  " : index + 1 + "."}</Text>
          {instruction}
        </Box>
      ))}
    </>
  );
};

type ToolProperties = {
  name: string;
  description: string;
  setupInstructions: React.ReactNode;
  showBorder: boolean;
  isReady: boolean;
};

const ToolControl = ({ name, description, setupInstructions, showBorder, isReady }: ToolProperties) => (
  <Box
    flexDirection="column"
    alignItems="flex-start"
    width="100%"
    rowGap={1}
    paddingTop={1}
    paddingBottom={1}
    paddingX={4}
    borderStyle="single"
    borderColor="white"
    borderDimColor={true}
    borderTop={false}
    borderBottom={showBorder}
    borderLeft={false}
    borderRight={false}
  >
    <Box columnGap={2} width="100%">
      {isReady ? (
        <Text bold color="green">
          ✓
        </Text>
      ) : (
        <Text bold color="red">
          ✗
        </Text>
      )}
      <Box flexDirection="column" rowGap={1} flexGrow={3}>
        <Text key={"name"} bold={true}>
          {name}
        </Text>
        <Text key={"description"}>{description}</Text>
      </Box>
    </Box>
    {!isReady && (
      <Box columnGap={2}>
        <Box flexDirection="column">{setupInstructions}</Box>
      </Box>
    )}
  </Box>
);

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const UI = ({ accessCode }: { accessCode: string }) => {
  const [previousRequests, setPreviousRequests] = useState<Request[]>([]);
  const [previousRequestCount, setPreviousRequestCount] = useState<number>(0);

  const onRequest = useCallback<OnRequestHandler>(({ uuid, query, operationId, status, timestamp, body }) => {
    // check if there is a previous request with the same uuid
    const prevRequest = previousRequests.find((request) => request.uuid === uuid);
    if (prevRequest) {
      // if there is, update the status
      prevRequest.status = status;
      prevRequest.body = body;
    } else {
      // otherwise, add a new request
      setPreviousRequestCount((count) => count + 1);
      previousRequests.push({
        uuid,
        query: Object.fromEntries(Object.entries(query).filter(([key, value]) => key !== "authToken")),
        operationId,
        status,
        timestamp,
        body,
      });
    }

    // only keep the last 10 requests, sorted by timestamp
    setPreviousRequests(previousRequests.sort((a, b) => a.timestamp.valueOf() - b.timestamp.valueOf()).slice(-10));
  }, []);

  useEffect(() => {
    setOnRequest(onRequest);
  }, [onRequest]);

  const [url, setUrl] = useState<string>();

  const [spinnerStep, setSpinnerStep] = useState(0);

  const [isShortcutReady, setIsShortcutReady] = useState<boolean>(false);
  const [isMessagesReady, setIsMessagesReady] = useState<boolean>(false);

  useEffect(() => {
    void startApp({ setUrl });
  }, []);

  const { focusNext, focusPrevious } = useFocusManager();
  useInput((_input, key) => {
    if (key.upArrow || key.leftArrow) {
      focusPrevious();
    } else if (key.downArrow || key.rightArrow) {
      focusNext();
    }
  });

  useEffect(() => {
    const checkReadiness = () => {
      setIsShortcutReady(Shortcut.resolver.isReady());
      setIsMessagesReady(iMessage.resolver.isReady());
    };

    const spinnerStepInterval = setInterval(() => {
      setSpinnerStep((step) => step + 1);
    }, 100); // 10 fps

    checkReadiness(); // check once
    const moduleReadinessInterval = setInterval(checkReadiness, 1000); // check every second

    return () => {
      clearInterval(spinnerStepInterval);
      clearInterval(moduleReadinessInterval);
    };
  }, [setSpinnerStep, setIsShortcutReady, setIsMessagesReady]);

  return (
    <Box flexDirection="column" alignItems="center" rowGap={1} paddingTop={1}>
      <Text bold>iter toolbox</Text>
      <Text dimColor>Pro tip: navigate with tab or arrow keys</Text>
      <Box
        key="connection"
        alignSelf="center"
        width="90%"
        flexDirection="column"
        alignItems="flex-start"
        borderStyle="round"
        borderColor="white"
        borderDimColor={true}
        rowGap={1}
        paddingY={1}
      >
        {url ? (
          <Box key={"instructions"} flexDirection={"column"} paddingX={4} rowGap={1}>
            <Instructions
              title={"Connecting to ChatGPT"}
              instructions={[
                <Text>Go to chat.openai.com. You must be on ChatGPT Plus or Enterprise.</Text>,
                <Text>From the left menu, go to "Explore", then "Create a GPT", and go to the "Configure" tab</Text>,
                <Box flexDirection={"column"} rowGap={1} width={"100%"}>
                  <Text>Under the section "Instructions", paste in the following system prompt:</Text>
                  <Box justifyContent={"space-between"} columnGap={4} width={"100%"} height={1}>
                    <Text color="yellow" wrap={"truncate-end"}>
                      {systemPrompt}
                    </Text>
                    <Button
                      text={"Copy"}
                      activeText={"Copied"}
                      focusText={"Press enter to copy"}
                      autoFocus={true}
                      onClick={() => {
                        pbcopy(systemPrompt);
                      }}
                    />
                  </Box>
                </Box>,
                <Box flexDirection={"column"} rowGap={1} width={"100%"}>
                  <Text>
                    Under the section "Actions", click on "Create new action", and then "Import from URL". Paste in the
                    following URL:
                  </Text>
                  <Box justifyContent={"space-between"} columnGap={4} width={"100%"} height={1}>
                    <Text color="yellow" wrap={"truncate-end"}>
                      {url}
                    </Text>
                    <Button
                      text={"Copy"}
                      activeText={"Copied"}
                      focusText={"Press enter to copy"}
                      onClick={() => {
                        pbcopy(url);
                      }}
                    />
                  </Box>
                </Box>,
              ]}
            />
          </Box>
        ) : (
          <Heading>{spinnerFrames[spinnerStep % spinnerFrames.length]} Starting server</Heading>
        )}
      </Box>

      {url && (
        <Box
          key={"access"}
          flexDirection="column"
          alignItems="flex-start"
          width="90%"
          borderStyle="round"
          borderColor="white"
          borderDimColor={true}
        >
          <ToolControl
            name={"Shortcuts"}
            description={"Permissions to trigger macOS Shortcut actions"}
            setupInstructions={
              <Instructions
                title="Setup"
                titleMarginBottom={1}
                instructions={[
                  <Box flexDirection={"column"} rowGap={1} width={"100%"}>
                    <Box justifyContent={"space-between"} columnGap={4} width={"100%"}>
                      <Text>Install the iter toolbox Shortcut</Text>
                      <Button
                        text={"Open"}
                        activeText={"Opened"}
                        focusText={"Press enter to open"}
                        onClick={() => {
                          Shortcut.resolver.setup!();
                        }}
                      />
                    </Box>
                    <Text color={"yellow"}>
                      {"Waiting for installation " + spinnerFrames[spinnerStep % spinnerFrames.length]}
                    </Text>
                  </Box>,
                ]}
              />
            }
            showBorder={true}
            isReady={isShortcutReady}
          />
          <ToolControl
            name={"Messages"}
            description={"Permissions to read iMessage conversations"}
            setupInstructions={
              <Instructions
                title="Setup"
                titleMarginBottom={1}
                instructions={[
                  <Box justifyContent={"space-between"} columnGap={4} width={"100%"}>
                    <Text>Open "System Preferences". On the left bar, select "Privacy & Security"</Text>
                    <Button
                      text={"Open"}
                      activeText={"Opened"}
                      focusText={"Press enter to open"}
                      onClick={() => {
                        child_process.execSync(`open x-apple.systempreferences:com.apple.preference.security?Privacy`);
                      }}
                    />
                  </Box>,
                  <Box marginBottom={1}>
                    <Text>Under the section "Privacy," find "Full Disk Access"</Text>
                  </Box>,
                  <Box marginBottom={1}>
                    <Text>Allow access for "Terminal" or your current terminal application</Text>
                  </Box>,
                  <Box flexDirection={"column"} rowGap={1}>
                    <Text>When prompted to restart your terminal, select "Later"</Text>
                    <Text color={"yellow"}>
                      {"Waiting for access " + spinnerFrames[spinnerStep % spinnerFrames.length]}
                    </Text>
                  </Box>,
                ]}
              />
            }
            showBorder={false}
            isReady={isMessagesReady}
          />
        </Box>
      )}

      {url && (
        <Box
          key={"previousRequests"}
          alignSelf="center"
          width="90%"
          flexDirection="column"
          alignItems="flex-start"
          borderStyle="round"
          borderColor="white"
          borderDimColor={true}
          paddingY={previousRequests.length === 0 ? 1 : 0}
          paddingX={previousRequests.length === 0 ? 4 : 0}
          height={Math.max(previousRequests.length + 2, 5)}
        >
          {previousRequests.length === 0 && (
            <Text key={"placeholder"} dimColor>
              {spinnerFrames[spinnerStep % spinnerFrames.length] + "  Listening for requests "}
            </Text>
          )}
          {previousRequests.map(({ status, uuid, timestamp, query, operationId, body }, idx) => (
            <Box key={uuid} flexDirection={"row"} columnGap={1} width={"100%"} height={1} paddingRight={4}>
              <Box key={"num"} minWidth={5} justifyContent={"flex-end"}>
                <Text color={"gray"}>{previousRequestCount + idx - previousRequests.length + 1}</Text>
              </Box>
              <Box key={"status"} minWidth={8} height={1}>
                <Text color={(status === "SUCCESS" && "green") || (status === "ERROR" && "red") || "yellow"}>
                  {" " + status}
                </Text>
              </Box>

              <Box key={"timestamp"} minWidth={timestamp.toLocaleTimeString("en-GB").length}>
                <Text color={"gray"}>{timestamp.toLocaleTimeString("en-GB")}</Text>
              </Box>
              <Box key={"operationId"} minWidth={operationId.length}>
                <Text bold>{operationId}</Text>
              </Box>
              <Text wrap={"truncate-end"}>
                {Object.entries(query).map(([key, value], index) => (
                  <Fragment key={index}>
                    <Text key={`key`}>{key}</Text>
                    <Text key={`seperator`} color={"gray"}>
                      =
                    </Text>
                    <Text key={`value`}>{JSON.stringify(value)}</Text>
                  </Fragment>
                ))}
                <Text dimColor>{(Object.entries(query).length ? " " : "") + JSON.stringify(body)}</Text>
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

// error and exit if not running on macOS
if (process.platform !== "darwin") {
  console.error("iter toolbox must be run on macOS");
  process.exit(1);
}

// start rendering the ui
console.clear();
render(<UI accessCode={auth.accessCode} key={"ui"} />, { patchConsole: true });
