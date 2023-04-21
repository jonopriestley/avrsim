
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

// Let tab be '\t' instead of move to next element
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



// Let tab be '\t' instead of move to next element
code_box.addEventListener('scroll', event => {
  
  const lines_box = document.getElementById('lines_box');
  lines_box.scrollTop = code_box.scrollTop;

}
);


