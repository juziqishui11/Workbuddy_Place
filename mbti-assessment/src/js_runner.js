const fs = require("fs");
const path = require("path");
const MBTIEngine = require("./engine.js");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "data.json"), "utf8"));
const answers = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

const real = MBTIEngine.remapDisplayAnswers(answers);
const out = MBTIEngine.calculateScores(real, data.questions, data.profiles, data.dimensions);
process.stdout.write(JSON.stringify(out));
