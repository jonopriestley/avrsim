
/////// Add script support ///////

const code_box = document.getElementById('code_box');
const keys_down = [];


// Let tab be '\t' instead of move to next element
code_box.addEventListener('keydown', event => {
  // Add key to list of key's down
  if (!keys_down.includes(event.key)) {
    keys_down.push(event.key);
  }

  // Update max value for break point
  document.getElementById('break_point').max = `${code_box.value.split('\n').length + 1}`;

  // When enter key is pressed update the line number of the breakpoint if it has changed
  if (event.key === 'Enter') {
    const value = parseInt(document.getElementById('break_point').value, 10);
    const start_of_break_point_line = code_box.value.split('\n').slice(0, value - 1).toString().replaceAll(',', '').length + value - 1;
    if (code_box.selectionStart <= start_of_break_point_line) document.getElementById('break_point').value = `${value + 1}`;
  }

  // allowing tab to work in a text section
  //if (keys_down.length === 1 && keys_down.includes('Tab')) {
  if (event.key === 'Tab') {
    event.preventDefault();
    const start = code_box.selectionStart;
    const end = code_box.selectionEnd;

    if (code_box.value.substring(start, end).includes('\n')) { // multiline tab
      // go back to the start OR to the previous \n
      let i = start;
      while (i > 0) {
        if (code_box.value[i - 1] === '\n') {
          break;
        }
        i = i - 1;
      }

      // add \t if you're at index 0 (since you can't go back any further)
      if (i === 0) {
        code_box.value = '\t' + code_box.value;
        i = i + 1;
      }
      
      // add \t after each \n
      while (i < end) {
        if (code_box.value[i - 1] === '\n') {
          code_box.value = code_box.value.substring(0, i) + '\t' + code_box.value.substring(i);
        }
        i = i + 1;
      }
      
    } else { // singleline tab
      code_box.value = code_box.value.substring(0, start) + '\t' + code_box.value.substring(end);
    }

    code_box.selectionEnd = end + 1;  // move the text caret to the tab point
  }

  //else if (keys_down.length === 2 && keys_down.includes('Shift') && keys_down.includes('Tab')) {}
});

document.addEventListener('keyup', event => {
  // Remove key from list of key's down
  const k = keys_down.indexOf(event.key);
  if (k !== -1) {
    keys_down.splice(k,1);
  }
});

// Make the line numbers on keyup
code_box.addEventListener('keyup', event => {
  // count lines and make the line counter display that many lines
  const line_count = code_box.value.split('\n').length;
  const lines_box = document.getElementById('lines_box');
  lines_box.innerHTML = '';
  
  for (let i = 1; i < line_count + 1; i++) {
    lines_box.innerHTML += `${i}\n`;
  }
});


// Scroll both boxes
code_box.addEventListener('scroll', event => {
  const lines_box = document.getElementById('lines_box');
  lines_box.scrollTop = code_box.scrollTop;
});

const buttons = document.getElementsByClassName('button');

// Button mouse enter
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener('mouseenter', event => {
    buttons[i].style.backgroundColor = (app.theme === 'light') ? '#eee' : '#3e3e3e';
    buttons[i].style.borderColor = (app.theme === 'light') ? '#d0d0d0' : '#5e5e5e';
  });
}

// Button mouse leave
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener('mouseleave', event => {
    buttons[i].style.backgroundColor = (app.theme === 'light') ? '#fff' : '#2e2e2e';
    buttons[i].style.borderColor = (app.theme === 'light') ? '#e0e0e0' : '#4e4e4e';
  });
}

// Button mouse down
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener('mousedown', event => {
    buttons[i].style.backgroundColor = (app.theme === 'light') ? '#ddd' : '#4e4e4e';
    buttons[i].style.borderColor = (app.theme === 'light') ? '#c0c0c0' : '#6e6e6e';
  });
}

// Button mouse up
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener('mouseup', event => {
    buttons[i].style.backgroundColor = (app.theme === 'light') ? '#eee' : '#3e3e3e';
    buttons[i].style.borderColor = (app.theme === 'light') ? '#d0d0d0' : '#5e5e5e';
  });
}