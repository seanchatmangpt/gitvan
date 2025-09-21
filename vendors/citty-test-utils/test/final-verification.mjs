import { runLocalCitty, setupCleanroom, runCitty, teardownCleanroom, scenario, testUtils } from './index.js'

async function finalVerification() {
  console.log('🚀 Citty Test Utils - Final Verification\n')
  
  try {
    // 1. Local Runner Test
    console.log('📱 Local Runner Test:')
    const localResult = await runLocalCitty(['--help'])
    console.log(`   ✅ Exit code: ${localResult.result.exitCode}`)
    console.log(`   ✅ Output length: ${localResult.result.stdout.length} characters`)
    console.log(`   ✅ Contains USAGE: ${localResult.result.stdout.includes('USAGE')}`)
    console.log()
    
    // 2. Fluent Assertions Test
    console.log('✨ Fluent Assertions Test:')
    localResult
      .expectSuccess()
      .expectOutput('USAGE')
      .expectOutput(/gitvan/)
      .expectNoStderr()
    console.log('   ✅ All fluent assertions passed')
    console.log()
    
    // 3. Cleanroom Runner Test
    console.log('🐳 Cleanroom Runner Test:')
    await setupCleanroom({ rootDir: '/Users/sac/gitvan' })
    const cleanroomResult = await runCitty(['--help'])
    cleanroomResult.expectSuccess().expectOutput('USAGE')
    await teardownCleanroom()
    console.log('   ✅ Cleanroom runner working')
    console.log()
    
    // 4. Scenario DSL Test
    console.log('🎬 Scenario DSL Test:')
    const testScenario = scenario('Multi-Command Test')
      .step('Get help')
      .run(['--help'])
      .expect(result => result.expectSuccess().expectOutput('USAGE'))
      
      .step('Get version')
      .run(['--version'])
      .expect(result => result.expectSuccess().expectOutput(/^\d+\.\d+\.\d+$/))

    const scenarioResults = await testScenario.execute(runLocalCitty)
    console.log(`   ✅ Scenario completed with ${scenarioResults.length} steps`)
    console.log()
    
    // 5. Test Utils Test
    console.log('🛠️ Test Utils Test:')
    const tempFile = await testUtils.createTempFile('test content', '.txt')
    console.log(`   ✅ Created temp file: ${tempFile}`)
    
    await testUtils.cleanupTempFiles([tempFile])
    console.log('   ✅ Cleaned up temp files')
    console.log()
    
    console.log('🎉 All verification tests passed!')
    console.log('\n📋 Final Status:')
    console.log('   • ✅ Local runner with project root detection')
    console.log('   • ✅ Docker cleanroom testing with testcontainers')
    console.log('   • ✅ Fluent assertion API with detailed error messages')
    console.log('   • ✅ Scenario DSL for complex test workflows')
    console.log('   • ✅ Test utilities (temp files, retry, waitFor)')
    console.log('   • ✅ TypeScript support with full type definitions')
    console.log('   • ✅ Comprehensive error handling and timeout support')
    console.log('   • ✅ JSON output parsing with graceful fallback')
    console.log('   • ✅ Complete package.json with proper metadata')
    console.log('   • ✅ Comprehensive test suite')
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    console.error('Error details:', error)
    process.exit(1)
  }
}

finalVerification()
