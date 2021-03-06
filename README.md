# AVR Simulator
Simulator for AVR Instruction Set Architecture as taught in ELEC1601 at USyd.
- Requires Python to run
- If your Python does not come with Tkinter you will also need to install that

Download the entire repository as is and run
shell.py with a file passed to it to begin the
simulator. To run the file open a terminal window
in the folder and run the shell.py file,
passing in a file as the avr code file to be executed.

For example:
    
    python shell.py examples/triangle_nums.txt

Key Commands:

    <Esc>        -> quit
    <Ctrl+R>     -> run whole file
    <Ctrl+S>     -> step through code
    <Ctrl+E>     -> reset to beginning
    <Ctrl+C>     -> clear console

## Code Theme (won't work on Mac)
If you wish to use the code theme to make your
AVR code easier to navigate, I have provided an
XML file that can be used in Notepad++. To use it, go to
"Language > User Defined Language > Open User Defined Language Folder..."
then put the file in that folder. It will then
appear in the drop down list in the Language tab.

### Steps (for AVR.xml with dark mode)
-	Download Notepad++
-	Download the AVR.xml file
-	Go to *Language -> User Defined Language -> Open User Defined Language Folder*, and put AVR.xml in that folder then reboot the app.
-	Go to *Settings -> Preferences -> Dark Mode*, click Enable Dark Mode

Use the AVR language package for any AVR files you are writing.

