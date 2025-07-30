// Replace these with your EmailJS values
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";

// Replace with your church logo Base64 string
const LOGO_BASE64 = "data:image/png;base64,REPLACE_WITH_YOUR_BASE64_LOGO";

(function(){
  emailjs.init(EMAILJS_PUBLIC_KEY);
})();

function generateCode() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// Dynamic children fields
const childrenFieldsDiv = document.getElementById("children-fields");
const addChildBtn = document.getElementById("add-child-btn");

let childIndex = 0;
function addChildFields() {
  childIndex++;
  const childDiv = document.createElement("div");
  childDiv.className = "child-block";
  childDiv.innerHTML = `
    <fieldset>
      <legend>Child ${childIndex}</legend>
      <label>
        Name:<br>
        <input type="text" name="child_name_${childIndex}" required>
      </label><br>
      <label>
        Age:<br>
        <input type="number" name="child_age_${childIndex}" min="0" required>
      </label><br>
      <label>
        Allergies / Notes:<br>
        <textarea name="child_notes_${childIndex}"></textarea>
      </label><br>
      <button type="button" class="remove-child-btn">Remove Child</button>
    </fieldset>
  `;
  childrenFieldsDiv.appendChild(childDiv);

  childDiv.querySelector(".remove-child-btn").addEventListener("click", () => {
    childrenFieldsDiv.removeChild(childDiv);
    updateChildLegends();
  });
  updateChildLegends();
}

function updateChildLegends() {
  const legends = childrenFieldsDiv.querySelectorAll("fieldset legend");
  legends.forEach((legend, idx) => {
    legend.textContent = `Child ${idx + 1}`;
  });
  childIndex = legends.length;
}

addChildBtn.addEventListener("click", addChildFields);
// Add one child field by default
addChildFields();

let lastCheckinData = null;
let allCheckinData = []; // Store all check-ins for volunteer PDF

document.getElementById("checkin-form").addEventListener("submit", function(e) {
  e.preventDefault();

  const form = e.target;
  const parentEmail = form.parent_email.value.trim();
  const parentPhone = form.parent_phone.value.trim();
  const emergencyName = form.emergency_name.value.trim();
  const emergencyPhone = form.emergency_phone.value.trim();

  const children = [];
  const childBlocks = childrenFieldsDiv.querySelectorAll(".child-block");
  childBlocks.forEach((childDiv, idx) => {
    const name = childDiv.querySelector(`input[name="child_name_${idx + 1}"]`).value.trim();
    const age = childDiv.querySelector(`input[name="child_age_${idx + 1}"]`).value.trim();
    const notes = childDiv.querySelector(`textarea[name="child_notes_${idx + 1}"]`).value.trim();
    if (name && age) {
      children.push({ name, age, notes });
    }
  });

  if (children.length === 0) {
    document.getElementById("result").innerHTML = `<b>Error!</b> Please add at least one child.`;
    return;
  }

  const familyCode = generateCode();

  let childrenInfo = children.map((c, idx) =>
    `Child ${idx + 1}:\nName: ${c.name}\nAge: ${c.age}\nAllergies/Notes: ${c.notes || '-'}`).join('\n\n');

  const templateParams = {
    family_code: familyCode,
    parent_email: parentEmail,
    parent_phone: parentPhone,
    emergency_name: emergencyName,
    emergency_phone: emergencyPhone,
    children_info: childrenInfo
  };

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
    .then(function(response) {
      document.getElementById("result").innerHTML =
        `<b>Success!</b> Family checked in.<br>
        An email has been sent to ${parentEmail} with the code:<br>
        <span style="font-size:2em;font-weight:bold;">${familyCode}</span><br>
        <small>You can print a PDF with this info for your records.</small>`;
      lastCheckinData = {
        parentEmail,
        parentPhone,
        emergencyName,
        emergencyPhone,
        children,
        familyCode
      };
      allCheckinData.push({
        parentEmail,
        parentPhone,
        emergencyName,
        emergencyPhone,
        children,
        familyCode
      });
      document.getElementById("print-pdf-btn").style.display = "inline-block";
      document.getElementById("print-volunteer-pdf-btn").style.display = "inline-block";
      form.reset();
      childrenFieldsDiv.innerHTML = "";
      childIndex = 0;
      addChildFields();
    }, function(error) {
      document.getElementById("result").innerHTML =
        `<b>Error!</b> Could not send email.<br>
        Please check your information and try again.<br>
        <small>${error.text}</small>`;
      document.getElementById("print-pdf-btn").style.display = "none";
      document.getElementById("print-volunteer-pdf-btn").style.display = "none";
      lastCheckinData = null;
    });
});

document.getElementById("print-pdf-btn").addEventListener("click", function () {
  if (!lastCheckinData) return;
  const { parentEmail, parentPhone, emergencyName, emergencyPhone, children, familyCode } = lastCheckinData;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Add Logo
  if (LOGO_BASE64 && LOGO_BASE64.startsWith("data:image")) {
    doc.addImage(LOGO_BASE64, "PNG", 80, 10, 50, 50);
  }

  doc.setFontSize(18);
  doc.text("Children's Church Family Check-In", 15, 70);

  doc.setFontSize(12);
  doc.text(`Parent's Email: ${parentEmail}`, 15, 80);
  doc.text(`Parent's Phone: ${parentPhone}`, 15, 87);
  doc.text(`Emergency Contact: ${emergencyName}`, 15, 94);
  doc.text(`Emergency Phone: ${emergencyPhone}`, 15, 101);

  let yOffset = 108;
  children.forEach((c, idx) => {
    doc.text(`Child ${idx + 1}: ${c.name}`, 15, yOffset);
    doc.text(`Age: ${c.age}`, 80, yOffset);
    doc.text(`Allergies/Notes: ${c.notes || '-'}`, 15, yOffset + 7);
    yOffset += 16;
  });

  doc.setFontSize(16);
  doc.setTextColor(40, 80, 180);
  doc.text(`Check-Out Code: ${familyCode}`, 15, yOffset + 10);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Show this code at check-out to pick up your children.", 15, yOffset + 20);

  doc.save(`FamilyCheckIn_${parentEmail.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
});

// VOLUNTEER PDF BUTTON
document.getElementById("print-volunteer-pdf-btn").addEventListener("click", function () {
  if (!allCheckinData.length) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Add Logo
  if (LOGO_BASE64 && LOGO_BASE64.startsWith("data:image")) {
    doc.addImage(LOGO_BASE64, "PNG", 80, 10, 50, 50);
  }

  doc.setFontSize(18);
  doc.text("Volunteer Check-In List", 15, 70);

  let yOffset = 80;
  allCheckinData.forEach((data, fIdx) => {
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(`Family ${fIdx + 1}:`, 15, yOffset);
    yOffset += 6;
    doc.setFontSize(11);
    doc.text(`Parent Email: ${data.parentEmail}`, 15, yOffset);
    doc.text(`Parent Phone: ${data.parentPhone}`, 90, yOffset);
    yOffset += 6;
    doc.text(`Emergency: ${data.emergencyName} (${data.emergencyPhone})`, 15, yOffset);
    yOffset += 6;
    data.children.forEach((child, cIdx) => {
      doc.setFontSize(11);
      doc.setTextColor(40, 80, 180);
      doc.text(`Child ${cIdx + 1}: ${child.name}`, 15, yOffset);
      doc.setTextColor(0, 0, 0);
      doc.text(`Age: ${child.age}`, 90, yOffset);
      doc.text(`Code: ${data.familyCode}`, 140, yOffset);
      yOffset += 6;
      if (child.notes) {
        doc.setFontSize(10);
        doc.text(`Notes: ${child.notes}`, 20, yOffset);
        yOffset += 5;
      }
    });
    yOffset += 8;

    // Page break if near bottom
    if (yOffset > 270 && fIdx < allCheckinData.length - 1) {
      doc.addPage();
      yOffset = 20;
    }
  });

  doc.save("VolunteerCheckInList.pdf");
});
