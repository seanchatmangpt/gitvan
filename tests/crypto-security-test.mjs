#!/usr/bin/env node

/**
 * Security Implementation Test - Verify real cryptographic signatures
 * Tests the Ed25519 implementation in receipt.mjs and crypto.mjs
 */

import { tmpdir } from 'node:os';
import { join } from 'pathe';
import { existsSync, rmSync } from 'node:fs';
import { CryptoManager } from '../src/utils/crypto.mjs';
import { ReceiptManager } from '../src/pack/security/receipt.mjs';

async function runSecurityTests() {
  console.log('🔒 Testing GitVan Security Implementation\n');

  // Create temporary test directory
  const testDir = join(tmpdir(), `gitvan-security-test-${Date.now()}`);
  const gitvanDir = join(testDir, '.gitvan');

  try {
    // Test 1: CryptoManager key generation
    console.log('1️⃣ Testing CryptoManager key generation...');
    const crypto = new CryptoManager(gitvanDir);

    // Should have no keys initially
    if (crypto.hasKeyPair()) {
      throw new Error('Should not have keys initially');
    }

    // Generate keys
    const keyInfo = crypto.generateKeyPair();
    console.log(`   ✅ Generated keys: ${keyInfo.publicKeyPath}`);

    // Should now have keys
    if (!crypto.hasKeyPair()) {
      throw new Error('Should have keys after generation');
    }

    // Test 2: Basic signing and verification
    console.log('\n2️⃣ Testing basic signing and verification...');
    const testData = { message: 'Hello GitVan', timestamp: Date.now() };

    const signature = crypto.sign(testData);
    console.log(`   ✅ Created signature: ${signature.algorithm}`);
    console.log(`   📝 Signature length: ${signature.signature.length} chars`);

    const isValid = crypto.verify(testData, signature);
    if (!isValid) {
      throw new Error('Valid signature should verify as true');
    }
    console.log('   ✅ Signature verification passed');

    // Test 3: Invalid signature detection
    console.log('\n3️⃣ Testing invalid signature detection...');
    const invalidSignature = { ...signature, signature: 'invalid-base64-signature' };
    const isInvalid = crypto.verify(testData, invalidSignature);
    if (isInvalid) {
      throw new Error('Invalid signature should not verify');
    }
    console.log('   ✅ Invalid signature correctly rejected');

    // Test 4: Data tampering detection
    console.log('\n4️⃣ Testing data tampering detection...');
    const tamperedData = { ...testData, message: 'Tampered message' };
    const isTampered = crypto.verify(tamperedData, signature);
    if (isTampered) {
      throw new Error('Tampered data should not verify');
    }
    console.log('   ✅ Data tampering correctly detected');

    // Test 5: ReceiptManager integration
    console.log('\n5️⃣ Testing ReceiptManager integration...');
    const receiptManager = new ReceiptManager({
      sign: true,
      gitvanDir: gitvanDir
    });

    // Create a test receipt
    const mockPack = {
      manifest: {
        id: 'test-pack',
        version: '1.0.0',
        name: 'Test Package'
      },
      fingerprint: 'test-fingerprint'
    };

    const receipt = await receiptManager.create(mockPack, 'install', 'success', {
      message: 'Test installation'
    });

    console.log(`   ✅ Created signed receipt: ${receipt.id}@${receipt.version}`);
    console.log(`   🔐 Signature algorithm: ${receipt.signature.algorithm}`);
    console.log(`   🔑 Key fingerprint: ${receipt.signature.keyFingerprint}`);

    // Test 6: Receipt verification
    console.log('\n6️⃣ Testing receipt verification...');
    const verification = await receiptManager.verify(receipt);
    if (!verification.valid) {
      throw new Error(`Receipt verification failed: ${verification.errors.join(', ')}`);
    }
    console.log('   ✅ Receipt verification passed');

    // Test 7: Signature verification within receipt
    console.log('\n7️⃣ Testing signature verification within receipt...');
    const sigVerification = await receiptManager.verifySignature(receipt);
    if (!sigVerification) {
      throw new Error('Receipt signature verification failed');
    }
    console.log('   ✅ Receipt signature verification passed');

    // Test 8: Tampered receipt detection
    console.log('\n8️⃣ Testing tampered receipt detection...');
    const tamperedReceipt = { ...receipt, operation: 'uninstall' };
    const tamperedVerification = await receiptManager.verifySignature(tamperedReceipt);
    if (tamperedVerification) {
      throw new Error('Tampered receipt should not verify');
    }
    console.log('   ✅ Tampered receipt correctly rejected');

    // Test 9: Key fingerprint consistency
    console.log('\n9️⃣ Testing key fingerprint consistency...');
    const fingerprint1 = crypto.getPublicKeyFingerprint();
    const fingerprint2 = crypto.getPublicKeyFingerprint();
    if (fingerprint1 !== fingerprint2) {
      throw new Error('Key fingerprints should be consistent');
    }
    console.log(`   ✅ Key fingerprint consistent: ${fingerprint1}`);

    // Test 10: Key info methods
    console.log('\n🔟 Testing key info methods...');
    const keyInfoFromManager = receiptManager.getKeyInfo();
    if (!keyInfoFromManager || !keyInfoFromManager.hasKeys) {
      throw new Error('ReceiptManager should report having keys');
    }
    console.log(`   ✅ Key info: ${keyInfoFromManager.fingerprint}`);
    console.log(`   📁 Keys directory: ${keyInfoFromManager.keysDirectory}`);

    console.log('\n🎉 All security tests passed! The implementation is working correctly.');
    console.log('\n📊 Security Test Summary:');
    console.log('   • Ed25519 key generation: ✅');
    console.log('   • Cryptographic signing: ✅');
    console.log('   • Signature verification: ✅');
    console.log('   • Invalid signature detection: ✅');
    console.log('   • Data tampering detection: ✅');
    console.log('   • Receipt signing integration: ✅');
    console.log('   • Receipt verification: ✅');
    console.log('   • Tampered receipt detection: ✅');
    console.log('   • Key fingerprint consistency: ✅');
    console.log('   • Key management: ✅');

  } catch (error) {
    console.error('\n❌ Security test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSecurityTests().catch(console.error);
}

export { runSecurityTests };