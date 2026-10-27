let Event = require("./models/Event");
let { addDays } = require("./utils");

// DB khali ho to starter events daalo (dates aaj ke hisaab se, isliye kabhi purane nahi hote)
async function seedTrips() {
  let n = await Event.countDocuments({ type: "Trip" });
  if (n > 0) return;
  let base = { registered: 0, paid: true, dutyLeave: false, createdBy: null, organizerName: "Nexora Team" };
  let trips = [
    { title: "Manali Snow Trip", type: "Trip", destination: "Manali, Himachal Pradesh", date: addDays(40), endDate: addDays(44), time: "6:00 AM",
      location: "Meeting point: College Main Gate", desc: "4 nights, 5 days in Manali. Stay, breakfast and dinner, Solang Valley and Atal Tunnel visit, and bus travel both ways included.", seats: 40, registered: 22, price: 6499 },
    { title: "Jaipur Heritage Weekend", type: "Trip", destination: "Jaipur, Rajasthan", date: addDays(21), endDate: addDays(23), time: "5:30 AM",
      location: "Meeting point: College Main Gate", desc: "2 nights in the Pink City. Amber Fort, City Palace, Hawa Mahal and a local food walk with a guide. Stay and meals included.", seats: 35, registered: 14, price: 3299 },
    { title: "Rishikesh Adventure Camp", type: "Trip", destination: "Rishikesh, Uttarakhand", date: addDays(30), endDate: addDays(32), time: "6:30 AM",
      location: "Meeting point: College Main Gate", desc: "River rafting, riverside camping, bonfire night and a Ganga aarti visit. Safety gear and trained guides provided.", seats: 30, registered: 9, price: 4199 }
  ];
  await Event.insertMany(trips.map(function (e) { return Object.assign({}, base, e); }));
  console.log("Seeded " + trips.length + " starter trips.");
}

async function seedEvents() {
  let count = await Event.countDocuments({ type: { $ne: "Trip" } });
  if (count === 0) await seedBase();
  await seedTrips();
}

async function seedBase() {

  let base = { registered: 0, paid: false, price: 0, dutyLeave: false, createdBy: null, organizerName: "Nexora Team" };
  let list = [
    { title: "Web Development Bootcamp", type: "Workshop", date: addDays(-1), endDate: addDays(1), time: "10:00 AM", location: "Innovation Lab",
      desc: "Hands-on full stack web development workshop for beginners.", seats: 60, registered: 45, dutyLeave: true },
    { title: "AI Innovation Hackathon 2026", type: "Hackathon", date: addDays(7), endDate: addDays(8), time: "9:00 AM", location: "Main Auditorium",
      desc: "Build AI-powered solutions for healthcare, education, and sustainability.", seats: 100, registered: 72, dutyLeave: true },
    { title: "Cloud & DevOps Workshop", type: "Workshop", date: addDays(10), endDate: addDays(10), time: "11:00 AM", location: "Seminar Hall 2",
      desc: "Learn Docker, GitHub Actions, and cloud deployment with live demos.", seats: 50, registered: 38 },
    { title: "National Startup Summit", type: "Paid Event", date: addDays(14), endDate: addDays(14), time: "10:00 AM", location: "Convention Center",
      desc: "Meet founders, investors, and startup mentors from across India.", seats: 150, registered: 120, paid: true, price: 299 },
    { title: "Code Crusade 5.0", type: "Hackathon", date: addDays(18), endDate: addDays(19), time: "8:00 AM", location: "CS Department",
      desc: "48-hour inter-college hackathon. Tackle real-world problems in fintech, edtech, and smart cities.", seats: 80, registered: 54, dutyLeave: true },
    { title: "HealthTech Buildathon", type: "Hackathon", date: addDays(25), endDate: addDays(26), time: "9:00 AM", location: "Innovation Lab",
      desc: "Build solutions that improve patient care, diagnostics, or hospital management.", seats: 60, registered: 30 },
    { title: "Open Source Sprint", type: "Hackathon", date: addDays(32), endDate: addDays(32), time: "10:00 AM", location: "Main Auditorium",
      desc: "Contribute to open-source projects and win prizes. Beginner-friendly tracks available.", seats: 120, registered: 40, paid: true, price: 149 }
  ];

  await Event.insertMany(list.map(function (e) { return Object.assign({}, base, e); }));
  console.log("Seeded " + list.length + " starter events.");
}

module.exports = seedEvents;
