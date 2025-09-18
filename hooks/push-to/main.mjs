export default {
  name: "Main Branch Push Handler",
  description: "Triggers unrouting router on main branch pushes",
  type: "push",
  pattern: "main",

  job: "unrouting.route", // Reference to our unrouting job

  // Optional: Custom payload
  payload: {
    source: "push-event",
    branch: "main",
  },
};
