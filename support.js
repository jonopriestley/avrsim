
/////// Add script support ///////

const code_box = document.getElementById('code_box');

// Let tab be '\t' instead of move to next element
code_box.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const start = code_box.selectionStart;
      const end = code_box.selectionEnd;
  
      code_box.value = code_box.value.substring(0, start) + '\t' + code_box.value.substring(end);
  
      event.preventDefault();
    }
});

