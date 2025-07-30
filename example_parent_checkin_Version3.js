function checkInKid(name) {
  let kids = JSON.parse(localStorage.getItem('checkedInKids') || '[]');
  kids.push({ name });
  localStorage.setItem('checkedInKids', JSON.stringify(kids));
}