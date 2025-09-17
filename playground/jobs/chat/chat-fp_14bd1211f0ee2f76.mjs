async function({ ctx, payload, meta }) {
    const git = useGit();
    const template = useTemplate();
    const notes = useNotes();
    
    try {
        // Get the last tag
        const lastTag = await git.run(['describe', '--tags', '--abbrev=0']);
        
        // Get commits since last tag
        const commits = await git.logSinceLastTag();
        
        if (commits.length === 0) {
            return {
                ok: true,
                artifacts: [],
                summary: "No commits since last tag"
            };
        }
        
        // Generate changelog content
        const changelogContent = await template.renderString(`
# Changelog

All notable changes to this project will be documented in this file.

## [{{ version }}] - {{ date }}

{{#each commits}}
- {{ message }}
{{/each}}
        `, {
            version: lastTag.replace('v', ''),
            date: new Date().toISOString().split('T')[0],
            commits: commits.map(commit => ({
                message: commit.message.split('\n')[0]
            }))
        });
        
        // Write changelog file
        await git.writeFile('CHANGELOG.md', changelogContent);
        
        // Log completion to notes
        await notes.write(`Changelog generated for version ${lastTag}`);
        
        return {
            ok: true,
            artifacts: ["CHANGELOG.md"],
            summary: `Generated changelog for version ${lastTag} with ${commits.length} commits`
        };
    } catch (error) {
        console.error('Changelog generation failed:', error.message);
        
        // Log error to notes
        await notes.write(`Changelog generation failed: ${error.message}`);
        
        return {
            ok: false,
            error: error.message,
            artifacts: [],
            summary: "Changelog generation failed"
        };
    }
}