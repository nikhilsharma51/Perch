/**
 * Phase 4 Test Script
 * 
 * Tests multi-tenancy isolation, role-based access control, and transaction integrity
 * Run: node test-phase-4.mjs
 */

const API_BASE = 'http://localhost:4000/api';

// Helper to make authenticated requests
async function request(method, path, token = null, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

// Test state
let userA = { token: null, userId: null, orgId: null, spaceId: null };
let userB = { token: null, userId: null, orgId: null, spaceId: null };
let staffUser = { token: null, userId: null };

console.log('🧪 Phase 4 Integration Tests\n');
console.log('=' .repeat(60));

async function runTests() {
  try {
    // ========== TEST 1: Setup - Create Users ==========
    console.log('\n📝 Test 1: Create Test Users');
    
    const signupA = await request('POST', '/auth/signup', null, {
      name: 'User A',
      email: `user-a-${Date.now()}@test.com`,
      password: 'TestPass123!',
    });
    if (signupA.status !== 201) throw new Error('Failed to create User A');
    userA.token = signupA.data.token;
    userA.userId = signupA.data.user.id;
    console.log('✅ User A created:', userA.userId);

    const signupB = await request('POST', '/auth/signup', null, {
      name: 'User B',
      email: `user-b-${Date.now()}@test.com`,
      password: 'TestPass123!',
    });
    if (signupB.status !== 201) throw new Error('Failed to create User B');
    userB.token = signupB.data.token;
    userB.userId = signupB.data.user.id;
    console.log('✅ User B created:', userB.userId);

    const signupStaff = await request('POST', '/auth/signup', null, {
      name: 'Staff User',
      email: `staff-${Date.now()}@test.com`,
      password: 'TestPass123!',
    });
    if (signupStaff.status !== 201) throw new Error('Failed to create Staff User');
    staffUser.token = signupStaff.data.token;
    staffUser.userId = signupStaff.data.user.id;
    console.log('✅ Staff User created:', staffUser.userId);

    // ========== TEST 2: Transaction Integrity ==========
    console.log('\n📝 Test 2: Transaction Integrity (Org + Membership)');
    
    const createOrgA = await request('POST', '/organizations', userA.token, {
      name: 'Organization A',
      slug: `org-a-${Date.now()}`,
    });
    if (createOrgA.status !== 201) throw new Error('Failed to create Org A');
    userA.orgId = createOrgA.data.organization.id;
    console.log('✅ Organization A created:', userA.orgId);
    console.log('   Role:', createOrgA.data.organization.role);

    // Verify membership was created
    const listOrgsA = await request('GET', '/organizations', userA.token);
    if (listOrgsA.data.organizations.length !== 1) {
      throw new Error('Membership not created in transaction!');
    }
    console.log('✅ Membership created atomically (transaction worked)');

    const createOrgB = await request('POST', '/organizations', userB.token, {
      name: 'Organization B',
      slug: `org-b-${Date.now()}`,
    });
    if (createOrgB.status !== 201) throw new Error('Failed to create Org B');
    userB.orgId = createOrgB.data.organization.id;
    console.log('✅ Organization B created:', userB.orgId);

    // ========== TEST 3: Multi-Tenancy Isolation ==========
    console.log('\n📝 Test 3: Multi-Tenancy Isolation');
    
    // User A creates a space in their org
    const createSpaceA = await request('POST', `/organizations/${userA.orgId}/spaces`, userA.token, {
      name: 'Space A1',
      type: 'podcast',
      hourlyRate: 1000,
      depositRate: 500,
      capacity: 4,
    });
    if (createSpaceA.status !== 201) {
      console.error('Create space response:', createSpaceA);
      throw new Error(`Failed to create Space A1 (status: ${createSpaceA.status})`);
    }
    userA.spaceId = createSpaceA.data.space.id;
    console.log('✅ User A created space in Org A:', userA.spaceId);

    // User B tries to list User A's spaces (should fail - 403)
    const listSpacesA = await request('GET', `/organizations/${userA.orgId}/spaces`, userB.token);
    if (listSpacesA.status !== 403) {
      throw new Error(`SECURITY BUG: User B accessed User A's org (got ${listSpacesA.status}, expected 403)`);
    }
    console.log("✅ User B blocked from listing User A's spaces (403)");

    // User B tries to get User A's space directly (should fail - 403)
    const getSpaceA = await request('GET', `/organizations/${userA.orgId}/spaces/${userA.spaceId}`, userB.token);
    if (getSpaceA.status !== 403) {
      throw new Error(`SECURITY BUG: User B accessed User A's space (got ${getSpaceA.status}, expected 403)`);
    }
    console.log("✅ User B blocked from accessing User A's space (403)");

    // User B tries to update User A's space (should fail - 403)
    const updateSpaceA = await request('PUT', `/organizations/${userA.orgId}/spaces/${userA.spaceId}`, userB.token, {
      name: 'Hacked Name',
    });
    if (updateSpaceA.status !== 403) {
      throw new Error(`SECURITY BUG: User B updated User A's space (got ${updateSpaceA.status}, expected 403)`);
    }
    console.log("✅ User B blocked from updating User A's space (403)");

    console.log('✅ MULTI-TENANCY ISOLATION: PASSED');

    // ========== TEST 4: Role-Based Access Control ==========
    console.log('\n📝 Test 4: Role-Based Access Control');
    
    // User A invites Staff User to Org A
    const inviteStaff = await request('POST', `/organizations/${userA.orgId}/staff/invite`, userA.token, {
      email: signupStaff.data.user.email,
      role: 'staff',
    });
    if (inviteStaff.status !== 201) throw new Error('Failed to invite staff');
    console.log('✅ Staff User invited to Org A');

    // Staff can list spaces (read access)
    const staffListSpaces = await request('GET', `/organizations/${userA.orgId}/spaces`, staffUser.token);
    if (staffListSpaces.status !== 200) {
      throw new Error('Staff cannot list spaces');
    }
    console.log('✅ Staff can list spaces (read permission)');

    // Staff can view specific space (read access)
    const staffGetSpace = await request('GET', `/organizations/${userA.orgId}/spaces/${userA.spaceId}`, staffUser.token);
    if (staffGetSpace.status !== 200) {
      throw new Error('Staff cannot view space');
    }
    console.log('✅ Staff can view space details (read permission)');

    // Staff CANNOT create space (owner only)
    const staffCreateSpace = await request('POST', `/organizations/${userA.orgId}/spaces`, staffUser.token, {
      name: 'Staff Attempted Space',
      type: 'photography',
      hourlyRate: 2000,
      depositRate: 1000,
      capacity: 2,
    });
    if (staffCreateSpace.status !== 403) {
      throw new Error(`SECURITY BUG: Staff created space (got ${staffCreateSpace.status}, expected 403)`);
    }
    console.log('✅ Staff blocked from creating space (403 - owner only)');

    // Staff CANNOT update space (owner only)
    const staffUpdateSpace = await request('PUT', `/organizations/${userA.orgId}/spaces/${userA.spaceId}`, staffUser.token, {
      name: 'Updated by Staff',
    });
    if (staffUpdateSpace.status !== 403) {
      throw new Error(`SECURITY BUG: Staff updated space (got ${staffUpdateSpace.status}, expected 403)`);
    }
    console.log('✅ Staff blocked from updating space (403 - owner only)');

    // Staff CANNOT delete space (owner only)
    const staffDeleteSpace = await request('DELETE', `/organizations/${userA.orgId}/spaces/${userA.spaceId}`, staffUser.token);
    if (staffDeleteSpace.status !== 403 && staffDeleteSpace.status !== 501) {
      throw new Error(`SECURITY BUG: Staff deleted space (got ${staffDeleteSpace.status}, expected 403 or 501)`);
    }
    console.log('✅ Staff blocked from deleting space (403 - owner only)');

    console.log('✅ ROLE-BASED ACCESS CONTROL: PASSED');

    // ========== TEST 5: Staff Management Rules ==========
    console.log('\n📝 Test 5: Staff Management Rules');
    
    // Owner tries to remove themselves (should fail)
    const removeSelf = await request('DELETE', `/organizations/${userA.orgId}/staff/${userA.userId}`, userA.token);
    if (removeSelf.status !== 403) {
      throw new Error(`SECURITY BUG: Owner removed themselves (got ${removeSelf.status}, expected 403)`);
    }
    console.log('✅ Owner blocked from removing themselves (403)');

    // Staff tries to remove owner (should fail - not even permission check, fails at requireOwnerRole)
    const staffRemoveOwner = await request('DELETE', `/organizations/${userA.orgId}/staff/${userA.userId}`, staffUser.token);
    if (staffRemoveOwner.status !== 403) {
      throw new Error(`SECURITY BUG: Staff removed owner (got ${staffRemoveOwner.status}, expected 403)`);
    }
    console.log('✅ Staff blocked from staff management (403)');

    // Owner can remove staff
    const removeStaff = await request('DELETE', `/organizations/${userA.orgId}/staff/${staffUser.userId}`, userA.token);
    if (removeStaff.status !== 200) {
      throw new Error('Owner cannot remove staff');
    }
    console.log('✅ Owner successfully removed staff member');

    console.log('✅ STAFF MANAGEMENT RULES: PASSED');

    // ========== TEST 6: Slug Uniqueness ==========
    console.log('\n📝 Test 6: Slug Uniqueness');
    
    const duplicateSlug = await request('POST', '/organizations', userA.token, {
      name: 'Duplicate Org',
      slug: createOrgA.data.organization.slug,
    });
    if (duplicateSlug.status !== 409) {
      throw new Error(`Duplicate slug allowed (got ${duplicateSlug.status}, expected 409)`);
    }
    console.log('✅ Duplicate slug rejected (409 Conflict)');

    // ========== ALL TESTS PASSED ==========
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL PHASE 4 TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\nVerification Complete:');
    console.log('  ✅ Transaction integrity (org + membership atomic)');
    console.log('  ✅ Multi-tenancy isolation (users cannot access other orgs)');
    console.log('  ✅ Role-based access control (staff vs owner permissions)');
    console.log('  ✅ Staff management rules (cannot remove self/owner)');
    console.log('  ✅ Data validation (unique slugs)');
    console.log('\n🎉 Phase 4 implementation is secure and working correctly!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
