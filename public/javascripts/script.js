const handleChangeUploadFiles = (e) => {
  const filenames = [...e.files].map(f => f.name);
  const label = document.getElementById('label');
  const multiple = filenames.length > 1;
  label.innerText = `${multiple ? filenames.length : 'The'} file${multiple ? 's' : ''} you have selected`;
  const filenamesLabel = document.getElementById('filenames');
  filenamesLabel.innerText = filenames.join(', ');
};
