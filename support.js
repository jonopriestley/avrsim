
/////// Add script support ///////

const code_box = document.getElementById('code_box');

// Let tab be '\t' instead of move to next element
code_box.addEventListener('keydown', event => {
    // allowing tab to work in a text section
    if (event.key === 'Tab') {
      const start = code_box.selectionStart;
      const end = code_box.selectionEnd;
  
      code_box.value = code_box.value.substring(0, start) + '\t' + code_box.value.substring(end);
      
      code_box.selectionEnd = end + 1;  // move the text caret to the cab point
  
      event.preventDefault();
    }
    
}
);

// Make the line numbers on keyup
code_box.addEventListener('keyup', event => {
  // count lines and make the line counter display that many lines
  const line_count = code_box.value.split('\n').length;
  const lines_box = document.getElementById('lines_box');
  lines_box.innerHTML = '';
  
  for (let i = 1; i < line_count + 1; i++) {
    lines_box.innerHTML += `${i}\n`;
  }
}
);


// Scroll both boxes
code_box.addEventListener('scroll', event => {
  
  const lines_box = document.getElementById('lines_box');
  lines_box.scrollTop = code_box.scrollTop;

}
);



const buttons = document.getElementsByClassName('button');

// Button mouse enter
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener('mouseenter', event => {
    if (app.theme === 'light') {
      buttons[i].style.backgroundColor = '#eee';
      buttons[i].style.borderColor = '#d0d0d0';
    } else {
      buttons[i].style.backgroundColor = '#3e3e3e';
      buttons[i].style.borderColor = '#5e5e5e';
    }
  }
  );
}

// Button mouse leave
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener('mouseleave', event => {
    if (app.theme === 'light') {
      buttons[i].style.backgroundColor = '#fff';
      buttons[i].style.borderColor = '#e0e0e0';
    } else {
      buttons[i].style.backgroundColor = '#2e2e2e';
      buttons[i].style.borderColor = '#4e4e4e';
    }
  }
  );
}

// Button mouse down
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener('mousedown', event => {
    if (app.theme === 'light') {
      buttons[i].style.backgroundColor = '#ddd';
      buttons[i].style.borderColor = '#c0c0c0';
    } else {
      buttons[i].style.backgroundColor = '#4e4e4e';
      buttons[i].style.borderColor = '#6e6e6e';
    }
  }
  );
}

// Button mouse up
for (let i = 0; i < buttons.length; i++) {
  buttons[i].addEventListener('mouseup', event => {
    if (app.theme === 'light') {
      buttons[i].style.backgroundColor = '#eee';
      buttons[i].style.borderColor = '#d0d0d0';
    } else {
      buttons[i].style.backgroundColor = '#3e3e3e';
      buttons[i].style.borderColor = '#5e5e5e';
    }
  }
  );
}