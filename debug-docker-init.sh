#!/bin/bash

# Simple Docker test to debug the init command

echo "🐳 Running GitVan initialization debug in Docker..."

docker run --rm gitvan-cleanroom bash -c "
echo 'Current directory:' \$(pwd)
echo 'Files in workspace:' 
ls -la /workspace
echo 'Files in gitvan:' 
ls -la /gitvan/src/cli/
echo 'Testing init command directly:'
cd /workspace
node -e '
import(\"/gitvan/src/cli/init.mjs\").then(async (module) => {
  console.log(\"Init command loaded:\", typeof module.initCommand);
  try {
    await module.initCommand.run({
      args: {
        cwd: \"/workspace\",
        name: \"docker-test-project\",
        description: \"A Docker test project\"
      }
    });
    console.log(\"Init command completed successfully\");
  } catch (error) {
    console.log(\"Init command failed:\", error.message);
    console.log(\"Stack:\", error.stack);
  }
}).catch(console.error);
'
echo 'Files after init:'
ls -la /workspace
"
