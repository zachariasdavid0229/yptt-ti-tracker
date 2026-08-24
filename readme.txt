*******************************************************
				Automatic installation
*******************************************************

Installing RefTreeAnalyser requires these simple steps:

1. Open Downloaded Zip file
Open the zip file which you have downloaded from my website.

2. Copy files
Copy all files from the zip file to any folder you like on your system.

3. Unblock the file
Windows blocks files downloaded from the internet. To resolve this

- Right-click the file RefTreeAnalyserXL.xlam and select Properties
- Click the Unblock button or check-box near the bottom of the dialog.

4. Open add-in file RefTreeAnalyserXL.xlam (Users with Excel 2003 or older are advised to open the file called RefTreeAnalyser.xla)

5. Enable macro's:
You can either click Enable, or "Trust All From Publisher". The latter will ensure any future add-ins you download from my website will have their macro's enabled by default.

6. Install as Add-in

After enabling macro's, RefTreeAnalyser will ask you whether or not you wish to install it as an add-in.
Click yes to have the add-in available every time you start Excel.

*******************************************************
				Manual installation
*******************************************************
				
If nothing happens when you open RefTreeAnalyser, try this to install it:

- Close all Excel windows 
- Confirm in Task manager that no remaining Excel.exe processes are running, if there are, kill them
- Right-click the file RefTreeAnalyserXL.xlam and select Properties
- Click the Unblock button or check-box near the bottom of the dialog.
- Open Excel
- Click File, Options
- Click the Add-ins tab
- Click the Go... button (close to the bottom)
- Click the Browse button
- Find RefTreeAnalyserXL.xlam and click Open

*******************************************************
WHAT'S NEW
*******************************************************
Build 251:
- 3D worksheet references are now properly detected and are shown as a one parent node, with child nodes for each worksheet.
- The Sheet finder has been updated so it is clearer where the search characters are found in the worksheet names.
- Added a debugging log option to the project.

Build 250:
- The accuracy of the formula parser has been improved
- Improved the performance of finding object references
- The Formula report now lists the number of cells with that formula

Build 249:
- Updated Insert ToC form
- Added an option to Style Picker which automatically extends the selection to cells with the same formula

Build 248:
- Fixed bugs in Insert ToC

Build 247
- New feature: Style Picker
- Improved startup time
- Fixed issue regarding registration
- Added tooltips to several buttons

Build 246
- Improved Object References dialog
- Improved performance of translating the interface
- Speeded up cell animation and made it system independent
- Fixed issue regarding grouped shapes getting ungrouped 

Build 245
- Ensured view does not change when a workbook is saved

Build 244
 - Added an option to check for updates, but manually download them (to avoid issues with malware detection)

Build 243
 - Fixed a small bug in the Interface translation engine
 - Fixed a bug pertaining to having both FastExcel and RefTreeAnalyser installed
Build 242
 - Enhanced the search in 'Find a sheet'
 - Fixed bug. The RefersTo formula of a name is now shown in the Excel interface language
Build 241
 - Added localization. Languages: English, Dutch, German, French.
Build 240
 - Fixed issue calling functions in Name Manager when user also has Fast Excel installed
Build 239
 - Ensure active selection is retained rather than active cell
 - Improved finding UDF functions
 - Added option to list Queries and Connections in ToC
 - Optimized the unhiding of worksheets
 - Fixed flexfind issue: Clicking on "Change short-cut key" only works after first loading the add-in.
 - You can now disable the Name Manager and Flexfind short-cut keys

Build 238
 - Updated label on Find a Sheet to indicate it searches all sheets, not just worksheets
 - Changed hot-key to open the find-a-sheet dialog to ctrl+Alt+PgDown
 - Cell Error report now includes the formulas
 - Made Find a Sheet form sizable and updated its colors
 - Enabled changing FlexFind short-cut key 

Build 237
 - Added Search worksheets feature
 - Precedents to include objects references by default (Hyperlink, Validation and Conditional Formats, PQ Queries)
 - Better display of object references in the tree
 - Dependents Objects now includes objects on Chart sheets
 - Object placed on a chart sheet are now included in the Object Refs dialog

Build 236
 - Added a smaller precedents dialog

Build 235
 - Fixed an issue affecting Excel 2024 and older
 
Build 234
 - Added keyboard shortcuts to fully expand and collapse the trees (see tooltip on hover over the expander icons of the tree)

Build 233
 - Optimized RTA ribbon for smaller width screens
 - Fixed bug, Flexfind window now stays visible when switching worksheets

Build 232
 - Adds boxes around cells with literals in their formulas
 - Adds boxes around cells sharing the same formula
 - Fixed Name Manager short-cut key issue
 
Build 231: Upgrade to version 5.0: 
 - Updated design of dialogs and reports
 - Turn on focus cell when traversing references
 - Fixed issue with progress screen
 - Made dialogs sizeable for Mac
 - Ensured Short-cut keys for FlexFind and Name Manager work immediately
 - Updated cell error report to cater for merged cells and hidden cells
 - Fixed issue with finding references used by charts
 - Some bugfixes and enhancements to selecting cells with the same formula

Build 230: Fixed a bug in the Circular reference finder

Build 229: Added "Select cells with same formula" to the Select menu in the References group

Build 228: Small bugfix

Build 227: Improved performance of Cell error report. Improved update process so less messages appear. Hide Cell Highlighter button when ActiveX controls are disabled.

Build 226: fixed issue with Objects dialog

Build 225: Fixed issue for workbooks returning an Out of Memory error on the Names collection

Build 224: Fixed an issue regarding handling the Name Manager and Flexfind companion add-ins. Fixed a bug in the Cell Error report

Build 223: Fixed some startup issues with protected documents. Added count of objects on objects tree. Added Cell Error report.

Build 222: Fixed issue when Excel is set to show its start screen. Visualize: Improved display of table columns so the header is included

Build 221: Fixed bug: the tables drop-down on the RefTreeAnalsyer ribbon didn't always display the current table name. Added What's new button to the Help drop-down. Fixed issues for people also having FastExcel installed. Fixed compile error for old Excel versions.

Build 220: Added work-around for an Excel bug caused by merged cells which caused incomplete analysis of formulas on sheets with merged cells.

Build 219: Updated to work with new jkp-ads.com asp.net website

Build 218: Removed short-cut keys for Name Manager and FlexFind (these are now controlled by these add-ins)
Fixed bug in Object references
Improved Tile function
Fixed bug in finding references when the active cell is a named range

Build 217: Updated to version 4.0 with these new features: Integrated two popular addins (which also auto-update): 1. FlexFind, 2. Name Manager. Added sheet and table drop-downs to the ribbon for quick navigation. Improved the UI, like tooltips. Detects when a policy disables ribbon customization (which causes the RefTreeAnalyser tab not to appear). The question to purchase a new license will only be shown twice. After that, automatic updates is turned off.

Build 216: Several bug fixes regarding ribbon handling and menu creation

Build 215: Updated right-click cell menu. Added RefTreeAnalyser to right-click menu of Tables. Some users experienced crashes, due to the option to display buttons on Formulas tab of the ribbon. Therefore this option has been removed

Build 214: If a formula contains a named range, it now displays the formula of that named range and its precedents

Build 213: Improved error tracing
No longer removes hotkey preferences when add-in is uninstalled
Handle new 'trim empty cells' reference
Improved display of values in precedents tree
Improved design of precedents/dependents form for better readability
Removed $ signs from cell references in some labels for better readability
Fixed issue with @ references

Build 212: Fixed issue where visible area changes when tracing dependents.
Fixed range selection when reference is outside of the viewable range
Improved filtering of found objects

Build 211: Fixed issue with OK button of the ToC dialog not responding to a mouse click.

Build 210: Show What's new, the first time an updated version is loaded. 
When timing formulas takes very long, RefTreeAnalyser will temporarily show an option to stop the timing.
When you click the Precedents button (or its short-cut key) and an object is selected and not a range of cells, RefTreeAnalyser will show the references used by the object.

Build 209: small bug fix

Build 208: Added option to disable animation of selection

Build 207: Fixed error on hard-coded number cells when sheet has no formulas. Improved performance of selecting nodes in the precedents tree. Fixed issue when running off-sheet references on a workbook with workbook protection.

Build 206: New menu item: Select cells with hard-coded numbers

Build 205: Fixed an issue with protected sheets when analysing sheet links

Build 204:Updated functions list; Fixed bug pertaining to perpetual licenses; Fixed bug dependents error; Fixed bug circular references OneDrive files

Build 203:Added search in conditional formatting: databars, color scales and icon sets, Added Python support, Fixed bug in highlighting reference in formula, Fixed bug in Visualize, Fixed bug in insert link to ToC, Fixed bug in Formula report, now ignores text values starting with =

Build 202: Improved sheet interaction report. Added option to settings to keep pre-existing report sheets or overwrite them

Build 201: Fixed form positioning on Mac

Build 200: Fixed issues with forms not showing up

Build 199: Fixed wording of report sheet dialog, fixed reportsheet causing display of gridlines to change. Fixed bug in insert ToC for Excel in different languages

Build 198: Asks to re-use existing report sheets. Cancel the unprotect workbook or worksheet dialog and it will not reappear for other worksheets. You can now filter the Objects list.

Build 197: Fixed some issues regarding the size of the dialogs. Fixed Mac registration bug

Build 196: Cater for EnableCalculation setting of worksheets. Improved Sheet stats report. Improved Formula report. Unprotect sheets before all sheet stats.

Build 195: Enabled perpetual licenses (available on request)

Build 194: ToC now shows if a table is part of the Data Model and if a pivot table uses the Data Model. Fixed a formula parsing error

Build 193: Fixed an issue with the Off-sheet references report

Build 192: Fixed a display issue in Analyze Objects

Build 191: Fixed bug regarding highlighting named ranges containing . Characters
Added option to hide the display of cell values in the reference tree

Build 190: Fixed a bug that caused run-time errors when using the Check Formulas option. Made the dialogs compatible with screen reader software for the visually impaired. First build that is Mac compatible!

Build 189: If the formula returns a range reference, this is shown in the dependents tree

Build 188: Improved display of object references

Build 187: Improved highlighting feature: Changed highlighting method

Build 186: Improved highlighting feature: limit how often it causes scrolling

Build 185: Improved highlighting feature by reducing how often it recalculates, added more levels to the precedents dialog

Build 183: Improved cell highlighting feature

Build 182: New feature: Highlight cells with the same formula

Build 181: fixed bug in circular reference feature

Build 180: Fixed that the VBA Editor Control toolbox opens up when tracing dependents

Build 179: Added Report button on Check formulas feature. Changed ToC behavior: don't insert row for sheets already containing a hyperlink to the ToC

Build 178: Now also finds references in ColosScales Conditional formats

Build 177: Added External links to Table of Content

Build 176: Fixed a bug pertaining to older Excel versions (2007-2016)

Build 175: Version 3.0! New feature to count all udfs and LAMBDAs in your file has been vastly improved. Now uses top-left cell of a spill range to find formula precedents

Build 174: Improved 'Select cells with dependents'; Added counting UDF and LAMBDA functions

Build 173: Added warning message if you ask to find too many cells with dependents

Build 172: Fixed bug in off-sheet references option

Build 171: Internal build

Build 170: Improved sorting of chart series nodes on Objects dialog

Build 169: Worked around an Excel limitation to fix an issue with the Analyze off-sheet references tool

Build 168: Worked around a bug which Microsoft introduced

Build 167: Fixed a bug which I introduced in build 166 :-(

Build 166: Two updates: 1. The link back to the ToC is now independent of the name of the file 2. If you press Precedents when a chart is selected, you get all references pertaining to that chart

Build 165: Added Tables to the table of content option

Build 164: Added Form and ActiveX controls to the table of content option

Build 163: Ensured obscure reference containing both a table total row and a cell outside the table works

Build 162: Fix for 64 bit Excel

Build 161: Workaround for rare error regarding SAP add-in.

Build 160: Small bugfix to ensure backward compatibility with Excel 2013 and older.

Build 159: Improved display of object references

Build 158: The tool now recognizes external references in charts and no longer ignores them

Build 157: Fixed bug in Search Objects feature: chart titles with formulas are now properly listed with their charts

Build 156: Small fix for 64 bit Excel

Build 155: Added two new options: 1. Generate a Table of Contents and 2. Added a feedback button which takes you to a small survey so you can tell me what you like and what you do not like.

Build 154: Fixed a bug relating to 64 bit Office. This is a recommended update if you are using 64 Office, which nowadays is the default version installed with a Microsoft 365 license

Build 153: Internal version

Build 152: Improved performance and added an option to prevent the tool from offering to unprotect worksheets

Build 151: Added PowerQuery M code to Object search. Fixed a bug regarding finding cell references in Objects

Build 150: Added a Reset button on the settings form to reset the license registration

Build 149: You can now choose whether or not to display references in your formula more than once

Build 148: Fixed the wrong calculation setting (use 1 core only) of the add-in

Build 147: Improved the layout of the Object references dialog

Build 146: Fixed problem with not finding reference due to an alt+enter character in the formula

Build 145: Fixed problem with not finding reference to total row of tables in the format Table1[[#Totals],[May-2019]]

Build 144: VBA Project is now signed with a trusted code signing certificate

Build 143: Improved the Check Formulas interface

Build 142: Fixed a bug regarding handling of string literals in a formula

Build 141: Couple of bugs fixed

Build 140: Enabled selecting pivot table belonging to pivot chart

Build 139: Changed check for registration

Build 138: Fixed registration issue

Build 137: Fixed a bug with Visualization

Build 136: Internal build

Build 135: Fixed an issue with finding references in chart SERIES formula

Build 134: Improved finding, displaying and reporting of cell references used by Objects

Build 133: Internal build

Build 132: Updated the tool so it works with the new Excel Data Types (Geography and Stock) and with the new Dynamic Array references

Build 131: Improved display of Object dependencies, improved tiling windows next to Excel.

Build 129: Improved performance of formula checking and reporting significantly

Build 128: Added code to improve updating experience

Build 127: Adapted site addresses to use https

Build 126: Fixed runtime error due to third-party add-ins when checking if tool is installed

Build 125: Included Array formulas in circular reference checks

Build 124: Updated registration check

Build 122: Fixed a bug with finding Dependents introduced with build 121

Build 121: Improved performance of Dependents search

Build 120: Fixed small bug

Build 119: Added Report Function count

Build 118: Added option to settings to enable or disable automatic unhiding of worksheets

Build 117: Improved working of Tile option placing the dialog next to the Excel window, Improved reporting of formulas

Build 116: Enabled cyrrilic (and other non-western character sets)

Build 115: Fixed a small bug only occurring when you have a chartsheet selected

Build 114: Improved performance on analysing conditional formatting formulas

Build 113: Finally fixed an intermittent issue with the Visualize functionality on Excel 2016

Build 112: Fixed progress bar problems by enabling user to use taskbar instead

Build 111: Improved performance for Excel 2013 and 2016

Build 110: Fixed a crash of Excel due to corrupted add-in file

Build 109: Fixed repositioning of screen when re-activating dialog from Excel

Build 108: Added jump to pivotsource when you trace precedents when in a pivottable

Build 107: Fixed bug where range names were no longer listed (introduced with build 105)

Build 106: Fixed issue with short-cut keys not responding immediately after openening Excel

Build 105: Fixed bug, Pivottables were not listed when pointing to a table name

Build 104: Improved scrolling the selected cells into the viewable area of the screen

Build 103: Fixed not selecting off-sheet references from the precedents/dependents trees (introduced in build 102)

Build 102: Fixed bug changing objects hotkey; added work-around for people having issues with the Visualise option; fixed an issue with selecting objects from the treeview.

Build 101: Added workaround for Excel bug affecting the "Display Equation" function in non-English Excel versions

Build 100: Fixed bug regarding visualising merged cells

Build 099: Fixed small bug in report formulas

Build 098: Added "Display formulas as a mathematical equation"

Build 097: Improved scrolling within tables

Build 096: Added back double-click functionality to the treeview (same action as clicking Do ActiveCell)

Build 094: Fixed a bug causing crashes of Excel 2013 and 2016 when other certain add-ins are loaded

Build 093: Fixed a bug regarding unhiding worksheets

Build 092: Fixed a bug related to Excel 2013 and 2016; Improved Off-sheet references report to include checks for Tables and range names

Build 091: Variuos bug fixes

Build 088: Added a off-sheet references report which visualises the inter-sheet formula links of your workbook

Build 087: VBA code signed with new certificate, please make sure you update to this version!

Build 086: Skipped

Build 085: Fixed bug regarding setting errortracing hotkey

Build 084: Fixed objects bug and added automatic update of precedents/dependents tracking

Build 083: Fixed a bug in the sheet stats module

Build 082: Fixed a bug regarding whole-column references

Build 081: Improved error tracing, fixed bug regarding sheetnames with a pipe character

Build 080: Improved performance during finding dependents, improved Objects listing

Build 079: Fixed a number of windowing problems related to Excel 2013 and 2016, fixed a bug in the Find Object references

Build 078: Fixed hang when using check formulas

Build 077: Fixed asking for passwords when saving file

Build 076: Fixed runtime error when closing Excel with no workbooks present

Build 075: Added unprotecting/protecting of workbook and worksheets, Fixed issue with removal of arrows, fixed issue

Build 074: Not published

Build 073: Fixed tiny bug regarding editing of the formula in the dialog

Build 072: Improved window handling for Excel 2013 and up

Build 071: Fixed small issue with formula report and worksheet names that resemble dates

Build 069: Fixed bug (treeview not responding)

Build 068: Added Alt key support for hotkeys

Build 067: Avoid trying to remove arrows when no arrows have been added

Build 066: Improved grouping in the Objects dialog, fixed screenupdating bug

Build 065: Improved calculation timing

Build 064: Fixed a window resizing bug

Build 063: Fixed bug regarding startup screen not appearing in Excel 2013 (caused by an Office 2013 Update)

Build 062: Fixed bug regarding hotkeys not registering

Build 061: Fixed bug regarding startup screen not appearing in Excel 2013

Build 060: Added a Formula Report button

Build 059: fixed a compile error

Build 058: Changed registration behaviour, registered copies no longer access the Internet to check for registration

Build 057: Various small improvements

Build 056: Fixed bug regarding local range names.

Build 055: Added highlight formula blocks on "Check formulas" dialog, Improved performance of Check formulas.

Build 054: Enabled disable of hotkeys

Build 053: Improved handling of hotkeys

Build 052:

Added double-click to the treeviews

Build 051:

Added hotkey support for Objects and Check Formulas.

Build 050:

Fixed some bugs, improved reporting by adding hyperlinks

Build 049:

Improved progress bar for searching objects, prevented blank workbook when opening files from network shares

Build 048:

Made object search optional in find precedents/dependents

Build 047:

Beta version

Build 046:

Fixed a bug regarding Visualisation

Build 045:

Added the Object References feature to the find dependents and precedents dialog too.

Build 044:

Added the Object References feature

Build 043:

Fixed an issue with opening empty workbooks in 64 bit Excel 2013
Fixed issue with leaving an entry in the find dialog

Build 042:

Visualization: Improved placement of pictures of cells which are out of view

Build 041:

You can now change the visualisation colors in Settings.

Build 040:

Visualize option now also available for Excel 2003!

Build 039:

Bugfix

Build 038:

Bugfix

Build 037:

Added a new option to the tool: Visualize precedents. The precedents of a cell are visualised directly on the worksheet.

Build 036:

Fixed a bug on the reporting module

Build 035:

Improved tracing errors function

Build 034:

Fixed small windowing bug regarding Excel 2013

Build 033:

Important update: fixed some bugs in the multi-level precedents searching

Build 032:

Improved error tracing and functioning of the Stop button

Build 031:

Fixed windows covering each other in Excel 2013

Build 030:

RefTreeAnalyser no longer removes registration information when the add-in is unchecked.

Build 029:

Fixed a bug for Excel 2013, prevents messages being covered by the applications screens

Build 027:

Minor bugfix

Build 026:

Fixed bug regarding files opened in protected mode

Build 025:

Fixed bug with absolute cell references to multiple columns.

Build 024: 

Bugfix: improved unneeded scrolling when selecting cells.

Build 023: 

Minor bugfix

Build 022:

Improved returning to the selection prior to starting the tool.

Build 021:

Fixed an Excel 2007 issue.

Build 020:

A seperate add-in file was created for Excel versions prior to Excel 2007.

Build 019:

In some situations in Excel 2003 the "About" toolbar button showed the about screen of another add-in.

Build 018:

Fixed some problems regarding Excel 2003.

Build 017:

Fixed some problems regarding Excel 2003.

Build 015:

Fixed a tiny problem in About screen: RefTree does not properly show the registration state

Build 014:
Fixed a compile error that only Excel 2003 exhibits

Build 013:
Fixed a problem related to setting hotkeys
Made sure form position is remembered (and can be reset)

Build 012:
It is now possible to change the hotkeys.
I have also made sure that when an update is available, the help file is automatically updated too.
