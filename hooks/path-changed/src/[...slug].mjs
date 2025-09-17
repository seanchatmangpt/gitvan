export default {
  name: "Unrouting Path Change Handler",
  description: "Triggers unrouting router when files matching patterns change",
  type: "path",
  pattern: "src/**", // This will match any file in src/

  job: "unrouting.route", // Reference to our unrouting job

  // Optional: Custom payload
  payload: {
    source: "path-change-event",
    patterns: ["src/components/**", "src/pages/**", "src/api/**", "config/**"],
  },
};
