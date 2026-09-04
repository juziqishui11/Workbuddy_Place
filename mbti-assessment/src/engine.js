/* MBTI 评分引擎
 * 精确移植自 career-personality skill: scripts/calculate_mbti.py (v2.1.0)
 * 常量、算法、字段顺序与该脚本严格一致，保证同一组作答产出相同结果。
 *
 * 关键移植点：
 *  1) 百分比用 divRoundHalfUp 做整数有理数四舍五入，等效 Python decimal.ROUND_HALF_UP，
 *     避免 JS Number 二进制误差与 Python 默认 banker's rounding 的差异。
 *  2) DISPLAY_ORDER 与 SKILL.md §3.2.1 同源：视觉位置 1-44 → 题库真实 id。
 *  3) 16 型档案 / 维度对详情一律查表原文透传，不做任何文字生成。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.MBTIEngine = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DIMENSION_PAIRS = [
    { pair: "EI", option1: "E", option2: "I", name1: "外倾", name2: "内倾", label: "外倾-内倾" },
    { pair: "SN", option1: "S", option2: "N", name1: "实感", name2: "直觉", label: "实感-直觉" },
    { pair: "TF", option1: "T", option2: "F", name1: "思维", name2: "情感", label: "思维-情感" },
    { pair: "JP", option1: "J", option2: "P", name1: "判断", name2: "知觉", label: "判断-知觉" }
  ];

  var DISPLAY_ORDER = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 41,
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 42,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 43,
    31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 44
  ];

  var NORMALIZE_MAP = {
    Y: "A", YES: "A", TRUE: "A", "1": "A",
    N: "B", NO: "B", FALSE: "B", "2": "B"
  };

  function has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function val(v) {
    return v === undefined ? null : v;
  }

  function normalizeAnswer(value) {
    if (value === null || value === undefined) return "";
    var s = String(value).trim().toUpperCase();
    if (has(NORMALIZE_MAP, s)) return NORMALIZE_MAP[s];
    if (s === "A" || s === "B") return s;
    return "";
  }

  /* 视觉位置键 {1..44} → 真实题号 id 键。与 Python remap_display_answers 同校验。 */
  function remapDisplayAnswers(answers) {
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      throw new Error("答案必须是 JSON 对象，收到：" + Object.prototype.toString.call(answers));
    }
    var posToId = {}, i;
    for (i = 0; i < DISPLAY_ORDER.length; i++) posToId[String(i + 1)] = String(DISPLAY_ORDER[i]);

    var actual = Object.keys(answers);
    var missing = [], extra = [];
    for (i = 1; i <= 44; i++) if (!has(answers, String(i))) missing.push(String(i));
    for (i = 0; i < actual.length; i++) if (!has(posToId, actual[i])) extra.push(actual[i]);
    if (missing.length || extra.length) {
      throw new Error("答案键不合法：必须恰好提交视觉位置 1..44 共 44 键（值 A/B）。缺失键="
        + (missing.length ? missing.join(",") : "无") + "；多余键=" + (extra.length ? extra.join(",") : "无"));
    }

    var out = {};
    for (i = 1; i <= 44; i++) {
      var pos = String(i), real = posToId[pos], ans = normalizeAnswer(answers[pos]);
      if (!ans) throw new Error("视觉位置 " + pos + "（真实 id " + real + "）答案不合法：" + answers[pos] + "，必须为 A 或 B");
      out[real] = ans;
    }
    return out;
  }

  /* N/D 四舍五入取整（N>=0, D>0），等效 ROUND_HALF_UP：floor((2N+D)/(2D)) */
  function divRoundHalfUp(n, d) {
    return Math.floor((2 * n + d) / (2 * d));
  }

  function buildRoleProfiles(items) {
    var map = {}, i;
    for (i = 0; i < items.length; i++) map[String(items[i].type).toUpperCase()] = items[i];
    return map;
  }

  function buildDimensionDetails(items) {
    var index = {}, i, j;
    for (i = 0; i < items.length; i++) {
      var d = items[i], detailMap = {}, det = d.detail || [];
      for (j = 0; j < det.length; j++) detailMap[String(det[j].option).toUpperCase()] = det[j];
      index[String(d.dimension).toUpperCase()] = { object: d, detail: detailMap };
    }
    return index;
  }

  function detailFor(entry, letter) {
    var d = (entry && entry.detail ? entry.detail[letter] : null) || null;
    if (!d) return { name: null, feature: null, traits: null, characteristics: null };
    return {
      name: val(d.title),
      feature: val(d.feature),
      traits: val(d.traits),
      characteristics: val(d.characteristics)
    };
  }

  function calculateScores(answers, questions, profiles, dimensions) {
    var i, k;
    var counts = {};
    for (i = 0; i < DIMENSION_PAIRS.length; i++) {
      counts[DIMENSION_PAIRS[i].option1] = 0;
      counts[DIMENSION_PAIRS[i].option2] = 0;
    }

    var answeredIds = {};
    for (i = 0; i < questions.length; i++) {
      var q = questions[i], qid = String(q.id);
      if (!has(answers, qid)) continue;
      answeredIds[qid] = true;
      var ans = normalizeAnswer(answers[qid]);
      if (!ans) continue;
      var opts = q.options || [];
      for (k = 0; k < opts.length; k++) {
        if (String(opts[k].option).toUpperCase() === ans) {
          if (has(counts, opts[k].dimension)) counts[opts[k].dimension]++;
          break;
        }
      }
    }

    var totalQuestions = questions.length;
    var answeredCount = Object.keys(answeredIds).length;
    var status = answeredCount >= totalQuestions ? "completed" : "incomplete";

    var roleProfiles = buildRoleProfiles(profiles);
    var dimDetails = buildDimensionDetails(dimensions);

    var pairResults = [], resultLetters = [], dominantPercents = [];
    for (i = 0; i < DIMENSION_PAIRS.length; i++) {
      var pair = DIMENSION_PAIRS[i];
      var o1 = pair.option1, o2 = pair.option2;
      var s1 = counts[o1], s2 = counts[o2], total = s1 + s2;
      var p1 = 0, p2 = 0, result = null;

      if (total > 0) {
        p1 = divRoundHalfUp(s1 * 10000, total) / 100;
        p2 = divRoundHalfUp(s2 * 10000, total) / 100;
        result = s1 >= s2 ? o1 : o2;
      }
      if (result !== null) {
        resultLetters.push(result);
        dominantPercents.push(result === o1 ? p1 : p2);
      }

      var entry = dimDetails[pair.pair] || { object: {}, detail: {} };
      var winner = detailFor(entry, result);

      pairResults.push({
        pair: pair.pair,
        label: pair.label,
        option1: o1, name1: pair.name1, score1: s1, percent1: p1,
        option2: o2, name2: pair.name2, score2: s2, percent2: p2,
        result: result,
        result_name: winner.name,
        result_feature: winner.feature,
        result_traits: winner.traits,
        result_characteristics: winner.characteristics,
        option1_detail: detailFor(entry, o1),
        option2_detail: detailFor(entry, o2),
        dimension_name: val(entry.object.name),
        dimension_description: val(entry.object.description),
        dimension_prompt: val(entry.object.prompt)
      });
    }

    var dominantType = resultLetters.length === 4 ? resultLetters.join("") : null;

    var displayScore = 0;
    if (dominantPercents.length) {
      var sum = 0;
      for (i = 0; i < dominantPercents.length; i++) sum += dominantPercents[i];
      displayScore = Math.floor(sum / dominantPercents.length + 0.5);
    }

    var roleDetail = null;
    if (dominantType && roleProfiles[dominantType]) {
      var rp = roleProfiles[dominantType];
      roleDetail = {
        type: dominantType,
        name: val(rp.name),
        proportion: val(rp.proportion),
        description: val(rp.description),
        advantages: val(rp.advantages),
        disadvantages: val(rp.disadvantages),
        careers: val(rp.careers)
      };
    }

    var analysis = null;
    if (dominantType && roleDetail) {
      var lettersStr = resultLetters.join("、");
      var roleName = roleDetail.name || "";
      var careersStr = roleDetail.careers || "";
      var careersArr = careersStr.split("、").map(function (c) { return c.trim(); })
        .filter(function (c) { return c.length > 0; });
      var tail = careersArr.length ? careersArr.slice(0, 5).join("、") + " 等" : "";
      analysis = {
        summary: "用户在 " + lettersStr + " 四个维度胜出，人格类型为 " + dominantType
          + "（" + roleName + "），适合 " + tail + "方向。",
        recommendations: careersArr
      };
    }

    var out = {
      assessment_id: "MBTI-44-001",
      assessment_name: "MBTI 职业性格测评",
      status: status,
      answered_count: answeredCount,
      total_questions: totalQuestions,
      dimension_counts: counts,
      dimension_pairs: pairResults,
      dominant_type: dominantType,
      display_score: displayScore,
      max_score: 100,
      role_detail: roleDetail,
      analysis: analysis
    };

    if (status === "incomplete") {
      out.missing_questions = questions
        .filter(function (q) { return !has(answeredIds, String(q.id)); })
        .map(function (q) { return String(q.id); });
    }
    return out;
  }

  return {
    DIMENSION_PAIRS: DIMENSION_PAIRS,
    DISPLAY_ORDER: DISPLAY_ORDER,
    normalizeAnswer: normalizeAnswer,
    remapDisplayAnswers: remapDisplayAnswers,
    calculateScores: calculateScores
  };
});
