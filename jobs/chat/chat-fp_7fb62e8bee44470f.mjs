
export default {
  meta: { 
    desc: "Generated job for: Create a simple logging job", 
    tags: ["ai-generated", "job"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  async run({ ctx, payload, meta }) {
    try {
      console.log("Executing job: Create a simple logging job");
      
      // TODO: Implement job logic
      {
  "meta": {
    "desc": "A simple logging job that records a message to the console and optionally to a Git note.",
    "tags": ["logging", "simple", "audit"],
    "author": "GitVan AI",
    "version": "1.0.0"
  },
  "config": {
    "cron": null,
    "on": ["push"],
    "schedule": null
  },
  "implementation": {
    "type": "simple",
    "description": "Logs a message to console and optionally writes it as a Git note.",
    "parameters": [
      {
        "name": "message",
        "type": "string",
        "description": "The log message to record",
        "required": true,
        "default": ""
      },
      {
        "name": "writeNote",
        "type": "boolean",
        "description": "Whether to write the message as a Git note",
        "required": false,
        "default": false
      }
    ],
    "operations": [
      {
        "type": "log",
        "description": "Log the input message to console",
        "parameters": {
          "message": "{{ payload.message }}"
        }
      },
      {
        "type": "git-note",
        "description": "Write the log message as a Git note if enabled",
        "parameters": {
          "ref": "HEAD",
          "message": "{{ payload.message }}",
          "writeNote": "{{ payload.writeNote }}"
        }
      }
    ],
    "errorHandling": "graceful",
    "returnValue": {
      "success": "Message logged successfully.",
      "artifacts": []
    }
  },
  "values": {
    "specificValue1": "example log message",
    "specificValue2": true
  }
}
      
      return { 
        ok: true, 
        artifacts: [],
        summary: "Job completed successfully"
      }
    } catch (error) {
      console.error('Job failed:', error.message)
      return { 
        ok: false, 
        error: error.message,
        artifacts: []
      }
    }
  }
}