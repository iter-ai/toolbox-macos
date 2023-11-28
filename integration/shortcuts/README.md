### Shortcuts integration

[Shortcuts](<https://en.wikipedia.org/wiki/Shortcuts_(app)>) is a macOS app that allows users to automate tasks on their
devices.
`toolbox-macos` install the `iter toolbox` shortcut that helps exposes the shortcuts as endpoints for the model to call.
Essentially, the `iter toolbox` works as a router, triggering the correct shortcut based on the input action name and
pass along parameters.

The limitation of this approach is that we can only expose shortcuts that can take strings as input.
Many shortcuts require more complex objects as input, such as Music, Location, or App Windows.
Supporting these shorts requires chaining multiple shortcuts together, which is not supported by `toolbox-macos`.

The tool spec file (`spec.toolbox.yaml`) provides a helpful interface for maintaining the available shortcuts. This spec
lists all the available actions and their parameters.
More importantly, we edit the spec file to override the descriptions of some parameters and actions. The default
descriptions are not very user-friendly and often confuse the model. You can look for `override` in the spec file to see
changes we made.

`integration/shortcuts/script` contains the code for building the `iter toolbox` shortcut.

- `fetch.sh` downloads a regular shortcut file that you created in the Shortcuts app as a XML file. You need to share
  the shortcut to iCloud Drive and get the public link before you call this script. The XML files are stored
  in `integration/shortcuts/template`.
- `format.mts` generates a spec file `spec.toolbox.yaml` that contains the list of actions and parameters for
  the `iter toolbox` shortcut.
- `build.mts` stiches all the template shortcuts together and generate the final `iter toolbox` shortcut. Here, we adds
  conditional blocks that check the input action name, parses the parameters, and triggers the correct shortcut.
- `run.mts` is a helpful script that runs the `iter toolbox` shortcut with the given input action name and parameters.
  This is useful for debugging.

Below is a list of 128 supported shortcuts. You can also check out `spec.toolbox.yaml` for the full list of actions and
parameters.

#### Clock (`clock.shortcut`)

- `is.workflow.actions.comment`
- `com.apple.mobiletimer-framework.MobileTimerIntents.MTCreateAlarmIntent`
- `is.workflow.actions.timer.start`
- `is.workflow.actions.setvariable`
- `com.apple.clock.OpenTab`
- `com.apple.mobiletimer-framework.MobileTimerIntents.MTToggleAlarmIntent`
- `com.apple.mobiletimer-framework.MobileTimerIntents.MTGetAlarmsIntent`

#### Contacts (`contacts.shortcut`)

- `is.workflow.actions.filter.contacts`
- `is.workflow.actions.comment`
- `is.workflow.actions.setvariable`
- `is.workflow.actions.addnewcontact`

#### Maps (`maps.shortcut`)

- `is.workflow.actions.comment`
- `is.workflow.actions.getmapslink`
- `is.workflow.actions.gettraveltime`
- `is.workflow.actions.setvariable`
- `is.workflow.actions.getcurrentlocation`
- `is.workflow.actions.getdirections`
- `is.workflow.actions.searchmaps`

#### Mail (`mail.shortcut`)

- `is.workflow.actions.sendemail`
- `is.workflow.actions.comment`
- `is.workflow.actions.dictionary`
- `is.workflow.actions.setvariable`

#### [Things](https://culturedcode.com/things/mac/)

- `is.workflow.actions.comment`
- `com.culturedcode.ThingsMac.TAIItemEntity`
- `com.culturedcode.ThingsMac.TAIAddTodoWithQuickEntry`
- `com.culturedcode.ThingsMac.TAIAddHeading`
- `is.workflow.actions.setvariable`
- `com.culturedcode.ThingsMac.TAIShowItems2`
- `com.culturedcode.ThingsMac.TAIAddTodo2`
- `com.culturedcode.ThingsMac.TAIEditItems`
- `com.culturedcode.ThingsMac.TAIDuplicateItems`
- `com.culturedcode.ThingsMac.TINRunThingsURLIntent`
- `com.culturedcode.ThingsMac.TAIAddProject`
- `com.culturedcode.ThingsMac.TAIDeleteItems`
- `com.culturedcode.ThingsMac.TAIShowList2`

#### Files (`files.shortcut`)

- `is.workflow.actions.comment`
- `is.workflow.actions.file.delete`
- `is.workflow.actions.file.getfoldercontents`
- `is.workflow.actions.documentpicker.open`
- `is.workflow.actions.file.rename`
- `is.workflow.actions.file.select`
- `is.workflow.actions.setvariable`
- `is.workflow.actions.file.move`
- `is.workflow.actions.file.label`
- `is.workflow.actions.file.reveal`
- `is.workflow.actions.file.createfolder`

#### Notes (`notes.shortcut`)

- `is.workflow.actions.comment`
- `com.apple.mobilenotes.SharingExtension`
- `com.apple.Notes.DeleteNotesLinkAction`
- `is.workflow.actions.setvariable`
- `com.apple.Notes.CloseAppLocationLinkAction`
- `is.workflow.actions.appendnote`
- `com.apple.Notes.CloseNoteLinkAction`
- `is.workflow.actions.filter.notes`

#### Podcasts (`podcasts.shortcut`)

- `is.workflow.actions.properties.podcastshow`
- `is.workflow.actions.comment`
- `is.workflow.actions.getpodcastsfromlibrary`
- `is.workflow.actions.properties.podcast`
- `is.workflow.actions.searchpodcasts`
- `is.workflow.actions.setvariable`
- `is.workflow.actions.podcasts.subscribe`
- `is.workflow.actions.getepisodesforpodcast`
- `is.workflow.actions.playpodcast`

#### Reminders (`reminders.shortcut`)

- `is.workflow.actions.comment`
- `is.workflow.actions.filter.reminders`
- `is.workflow.actions.addnewreminder`
- `is.workflow.actions.setvariable`
- `is.workflow.actions.getupcomingreminders`
- `com.apple.reminders.TTRCreateListAppIntent`

#### Voice memos (`voicememos.shortcut`)

- `is.workflow.actions.comment`
- `com.apple.VoiceMemos.CreateFolder`
- `com.apple.VoiceMemos.RecordVoiceMemoIntent`
- `com.apple.VoiceMemos.OpenFolder`
- `com.apple.VoiceMemos.DeleteFolder`
- `is.workflow.actions.setvariable`
- `com.apple.VoiceMemos.SearchRecordings`
- `com.apple.VoiceMemos.SelectRecording`
- `com.apple.VoiceMemos.DeleteRecording`
- `com.apple.VoiceMemos.ChangeRecordingPlaybackSetting`
- `com.apple.VoiceMemos.PlaybackVoiceMemoIntent`

#### Calendar (`calendar.shortcut`)

- `is.workflow.actions.properties.eventattendees`
- `is.workflow.actions.comment`
- `is.workflow.actions.addnewcalendar`
- `is.workflow.actions.getupcomingevents`
- `is.workflow.actions.removeevents`
- `is.workflow.actions.addnewevent`
- `is.workflow.actions.setvariable`
- `com.flexibits.fantastical2.mac.FKRChangeCalendarSetIntent`
- `is.workflow.actions.showincalendar`
- `com.apple.iCal.SetCalendarFocusConfiguration`
- `is.workflow.actions.filter.calendarevents`

#### Messages (`messages.shortcut`)

- `is.workflow.actions.sendmessage`
- `is.workflow.actions.comment`
- `is.workflow.actions.setvariable`
- `imessage.listChats`
- `imessage.listMessages`

#### Weather (`weather.shortcut`)

- `is.workflow.actions.comment`
- `is.workflow.actions.weather.currentconditions`
- `is.workflow.actions.properties.weather.conditions`
- `is.workflow.actions.setvariable`
- `is.workflow.actions.weather.forecast`

#### System (`system.shortcut`)

- `is.workflow.actions.displaysleep`
- `is.workflow.actions.getbatterylevel`
- `is.workflow.actions.wifi.set`
- `is.workflow.actions.logout`
- `is.workflow.actions.lockscreen`
- `is.workflow.actions.filter.windows`
- `is.workflow.actions.appearance`
- `is.workflow.actions.startscreensaver`
- `is.workflow.actions.reboot`
- `is.workflow.actions.nightshift.set`
- `is.workflow.actions.movewindow`
- `is.workflow.actions.dnd.set`
- `is.workflow.actions.setvariable`
- `is.workflow.actions.sleep`
- `is.workflow.actions.getwifi`
- `is.workflow.actions.resizewindow`
- `is.workflow.actions.runapplescript`
- `is.workflow.actions.comment`
- `is.workflow.actions.truetone.set`
- `is.workflow.actions.filter.displays`
- `is.workflow.actions.quit.app`
- `is.workflow.actions.getipaddress`
- `is.workflow.actions.openapp`
- `is.workflow.actions.getdevicedetails`
- `is.workflow.actions.comment`
- `is.workflow.actions.dnd.getfocus`
- `is.workflow.actions.setvariable`
