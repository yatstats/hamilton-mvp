// microsite-template/api/hs-programs.js
// FIRST PASS: no database. Just pretend data so fetch() works.

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");

  const sample = [
    {
      "hsname": "Hamilton High School",
      "city": "Chandler, AZ",
      "regionname": "Arizona",
      "YAT?STATS NATIONAL RANK": 1,
      "YAT?STATS STATE RANK": 1,
      "Current Active Alumni": 24,
      "MLB Players Produced": 3,
      "All-Time Next Level Alumni": 55,
      "Drafted out of High School": 2,
      "Drafted": 7,
      "Microsite Sub-Domain": "https://5004.yatstats.com"
    }
  ];

  res.status(200).json(sample);
}