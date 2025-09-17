export default {
  name: "Semantic Version Tag Handler",
  description: "Triggers unrouting router on semantic version tags",
  type: "tag",
  pattern: "semver",

  job: "unrouting.route", // Reference to our unrouting job

  // Optional: Custom payload
  payload: {
    source: "tag-event",
    tagType: "semver",
  },
};
