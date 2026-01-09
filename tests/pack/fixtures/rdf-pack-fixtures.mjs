// RDF Pack System Test Fixtures
// Provides sample packs, dependency graphs, and test data

export const SAMPLE_PACKS = {
  // Authentication pack
  authPack: {
    id: "pack-auth-1.0.0",
    turtle: `
@prefix pack: <https://gitvan.dev/pack#> .
@prefix license: <https://spdx.org/licenses#> .
@prefix prov: <http://www.w3.org/ns/prov#> .

:auth-1.0.0 a pack:Pack ;
  pack:name "auth" ;
  pack:version "1.0.0" ;
  pack:description "Authentication and authorization pack" ;
  pack:category "authentication" ;
  pack:license license:MIT ;
  pack:author "GitVan Team" ;
  pack:rating 4.8 ;
  pack:downloads 15000 ;
  pack:createdAt "2025-01-01T00:00:00Z"^^xsd:dateTime ;
  pack:updatedAt "2025-12-15T00:00:00Z"^^xsd:dateTime ;
  pack:keywords ( "auth" "jwt" "oauth" "security" ) ;
  pack:dependsOn :api-1.2.0, :ui-2.0.0 ;
  pack:requiresGitVan "^3.0.0" .
    `,
  },

  // Authentication pack v2.0.0 (breaking change)
  authPackV2: {
    id: "pack-auth-2.0.0",
    turtle: `
@prefix pack: <https://gitvan.dev/pack#> .
@prefix license: <https://spdx.org/licenses#> .

:auth-2.0.0 a pack:Pack ;
  pack:name "auth" ;
  pack:version "2.0.0" ;
  pack:description "Authentication and authorization pack v2" ;
  pack:category "authentication" ;
  pack:license license:MIT ;
  pack:author "GitVan Team" ;
  pack:rating 4.9 ;
  pack:downloads 25000 ;
  pack:createdAt "2026-01-01T00:00:00Z"^^xsd:dateTime ;
  pack:updatedAt "2026-01-09T00:00:00Z"^^xsd:dateTime ;
  pack:keywords ( "auth" "jwt" "oauth" "oidc" "security" ) ;
  pack:dependsOn :api-2.0.0, :ui-3.0.0 ;
  pack:requiresGitVan "^3.0.0" ;
  prov:wasDerivedFrom :auth-1.0.0 .
    `,
  },

  // API pack
  apiPack: {
    id: "pack-api-1.2.0",
    turtle: `
@prefix pack: <https://gitvan.dev/pack#> .
@prefix license: <https://spdx.org/licenses#> .

:api-1.2.0 a pack:Pack ;
  pack:name "api" ;
  pack:version "1.2.0" ;
  pack:description "RESTful API utilities" ;
  pack:category "api-gateway" ;
  pack:license license:Apache-2.0 ;
  pack:author "API Team" ;
  pack:rating 4.7 ;
  pack:downloads 30000 ;
  pack:createdAt "2024-06-01T00:00:00Z"^^xsd:dateTime ;
  pack:keywords ( "api" "rest" "http" "openapi" ) ;
  pack:requiresGitVan ">=2.0.0" .
    `,
  },

  // API pack v2.0.0
  apiPackV2: {
    id: "pack-api-2.0.0",
    turtle: `
@prefix pack: <https://gitvan.dev/pack#> .
@prefix license: <https://spdx.org/licenses#> .

:api-2.0.0 a pack:Pack ;
  pack:name "api" ;
  pack:version "2.0.0" ;
  pack:description "RESTful API utilities v2" ;
  pack:category "api-gateway" ;
  pack:license license:Apache-2.0 ;
  pack:author "API Team" ;
  pack:rating 4.9 ;
  pack:downloads 45000 ;
  pack:createdAt "2025-06-01T00:00:00Z"^^xsd:dateTime ;
  pack:keywords ( "api" "rest" "graphql" "grpc" "http" ) ;
  pack:requiresGitVan "^3.0.0" ;
  prov:wasDerivedFrom :api-1.2.0 .
    `,
  },

  // UI Components pack
  uiPack: {
    id: "pack-ui-2.0.0",
    turtle: `
@prefix pack: <https://gitvan.dev/pack#> .
@prefix license: <https://spdx.org/licenses#> .

:ui-2.0.0 a pack:Pack ;
  pack:name "ui" ;
  pack:version "2.0.0" ;
  pack:description "UI component library" ;
  pack:category "ui-components" ;
  pack:license license:MIT ;
  pack:author "UI Team" ;
  pack:rating 4.6 ;
  pack:downloads 20000 ;
  pack:createdAt "2024-08-01T00:00:00Z"^^xsd:dateTime ;
  pack:keywords ( "ui" "components" "react" "vue" ) ;
  pack:requiresGitVan ">=2.5.0" .
    `,
  },

  // UI Components pack v3.0.0
  uiPackV3: {
    id: "pack-ui-3.0.0",
    turtle: `
@prefix pack: <https://gitvan.dev/pack#> .
@prefix license: <https://spdx.org/licenses#> .

:ui-3.0.0 a pack:Pack ;
  pack:name "ui" ;
  pack:version "3.0.0" ;
  pack:description "UI component library v3" ;
  pack:category "ui-components" ;
  pack:license license:MIT ;
  pack:author "UI Team" ;
  pack:rating 4.8 ;
  pack:downloads 35000 ;
  pack:createdAt "2025-08-01T00:00:00Z"^^xsd:dateTime ;
  pack:keywords ( "ui" "components" "react" "vue" "svelte" ) ;
  pack:requiresGitVan "^3.0.0" ;
  prov:wasDerivedFrom :ui-2.0.0 .
    `,
  },

  // Database pack with GPL license
  dbPack: {
    id: "pack-db-1.0.0",
    turtle: `
@prefix pack: <https://gitvan.dev/pack#> .
@prefix license: <https://spdx.org/licenses#> .

:db-1.0.0 a pack:Pack ;
  pack:name "database" ;
  pack:version "1.0.0" ;
  pack:description "Database utilities and ORM" ;
  pack:category "database" ;
  pack:license license:GPL-3.0 ;
  pack:author "DB Team" ;
  pack:rating 4.5 ;
  pack:downloads 10000 ;
  pack:createdAt "2024-03-01T00:00:00Z"^^xsd:dateTime ;
  pack:keywords ( "database" "orm" "sql" "postgres" ) ;
  pack:requiresGitVan ">=2.0.0" .
    `,
  },

  // Analytics pack (dual license)
  analyticsPack: {
    id: "pack-analytics-1.5.0",
    turtle: `
@prefix pack: <https://gitvan.dev/pack#> .
@prefix license: <https://spdx.org/licenses#> .

:analytics-1.5.0 a pack:Pack ;
  pack:name "analytics" ;
  pack:version "1.5.0" ;
  pack:description "Analytics and metrics tracking" ;
  pack:category "monitoring" ;
  pack:license license:MIT, license:Commercial ;
  pack:author "Analytics Team" ;
  pack:rating 4.7 ;
  pack:downloads 8000 ;
  pack:createdAt "2024-10-01T00:00:00Z"^^xsd:dateTime ;
  pack:keywords ( "analytics" "metrics" "tracking" "monitoring" ) ;
  pack:dependsOn :api-1.2.0 ;
  pack:requiresGitVan "^3.0.0" .
    `,
  },

  // Testing utilities pack
  testingPack: {
    id: "pack-testing-1.0.0",
    turtle: `
@prefix pack: <https://gitvan.dev/pack#> .
@prefix license: <https://spdx.org/licenses#> .

:testing-1.0.0 a pack:Pack ;
  pack:name "testing" ;
  pack:version "1.0.0" ;
  pack:description "Testing utilities and fixtures" ;
  pack:category "testing" ;
  pack:license license:MIT ;
  pack:author "QA Team" ;
  pack:rating 4.4 ;
  pack:downloads 12000 ;
  pack:createdAt "2024-05-01T00:00:00Z"^^xsd:dateTime ;
  pack:keywords ( "testing" "qa" "fixtures" "mocks" ) ;
  pack:requiresGitVan ">=2.0.0" .
    `,
  },

  // Deployment pack
  deployPack: {
    id: "pack-deploy-2.1.0",
    turtle: `
@prefix pack: <https://gitvan.dev/pack#> .
@prefix license: <https://spdx.org/licenses#> .

:deploy-2.1.0 a pack:Pack ;
  pack:name "deploy" ;
  pack:version "2.1.0" ;
  pack:description "Deployment automation and CI/CD" ;
  pack:category "deployment" ;
  pack:license license:Apache-2.0 ;
  pack:author "DevOps Team" ;
  pack:rating 4.9 ;
  pack:downloads 18000 ;
  pack:createdAt "2024-09-01T00:00:00Z"^^xsd:dateTime ;
  pack:keywords ( "deploy" "cicd" "docker" "kubernetes" ) ;
  pack:dependsOn :testing-1.0.0 ;
  pack:requiresGitVan "^3.0.0" .
    `,
  },
};

// License compatibility matrix
export const LICENSE_COMPATIBILITY = `
@prefix license: <https://spdx.org/licenses#> .
@prefix compat: <https://gitvan.dev/license-compat#> .

# MIT is compatible with most licenses
license:MIT compat:compatibleWith license:Apache-2.0,
                                    license:BSD-3-Clause,
                                    license:GPL-3.0,
                                    license:LGPL-3.0,
                                    license:ISC .

# Apache 2.0 compatibility
license:Apache-2.0 compat:compatibleWith license:MIT,
                                          license:BSD-3-Clause,
                                          license:GPL-3.0,
                                          license:LGPL-3.0 .

# GPL 3.0 (copyleft - limited compatibility)
license:GPL-3.0 compat:compatibleWith license:GPL-3.0,
                                       license:LGPL-3.0 ;
                compat:incompatibleWith license:Apache-2.0,
                                         license:MIT,
                                         license:BSD-3-Clause,
                                         license:Commercial .

# BSD compatibility
license:BSD-3-Clause compat:compatibleWith license:MIT,
                                            license:Apache-2.0,
                                            license:GPL-3.0 .

# Commercial licenses
license:Commercial compat:incompatibleWith license:GPL-3.0,
                                            license:LGPL-3.0 .
`;

// Complex dependency graph
export const DEPENDENCY_GRAPH = {
  simple: {
    description: "Simple linear dependency: A -> B -> C",
    packs: [
      {
        name: "pack-a",
        version: "1.0.0",
        deps: ["pack-b@^1.0.0"],
      },
      {
        name: "pack-b",
        version: "1.0.0",
        deps: ["pack-c@^1.0.0"],
      },
      {
        name: "pack-c",
        version: "1.0.0",
        deps: [],
      },
    ],
  },

  diamond: {
    description: "Diamond dependency: A -> B,C -> D",
    packs: [
      {
        name: "pack-a",
        version: "1.0.0",
        deps: ["pack-b@^1.0.0", "pack-c@^1.0.0"],
      },
      {
        name: "pack-b",
        version: "1.0.0",
        deps: ["pack-d@^1.0.0"],
      },
      {
        name: "pack-c",
        version: "1.0.0",
        deps: ["pack-d@^1.0.0"],
      },
      {
        name: "pack-d",
        version: "1.0.0",
        deps: [],
      },
    ],
  },

  circular: {
    description: "Circular dependency: A -> B -> C -> A",
    packs: [
      {
        name: "pack-a",
        version: "1.0.0",
        deps: ["pack-b@^1.0.0"],
      },
      {
        name: "pack-b",
        version: "1.0.0",
        deps: ["pack-c@^1.0.0"],
      },
      {
        name: "pack-c",
        version: "1.0.0",
        deps: ["pack-a@^1.0.0"],
      },
    ],
  },

  conflict: {
    description: "Version conflict: A needs B@^1.0.0, C needs B@^2.0.0",
    packs: [
      {
        name: "pack-a",
        version: "1.0.0",
        deps: ["pack-b@^1.0.0"],
      },
      {
        name: "pack-c",
        version: "1.0.0",
        deps: ["pack-b@^2.0.0"],
      },
      {
        name: "pack-b",
        version: "1.0.0",
        deps: [],
      },
      {
        name: "pack-b",
        version: "2.0.0",
        deps: [],
      },
    ],
  },
};

// Performance test data generator
export function generatePerformanceTestPacks(count = 1000) {
  const packs = [];
  const categories = [
    "authentication",
    "api-gateway",
    "ui-components",
    "database",
    "monitoring",
    "testing",
    "deployment",
    "security",
  ];
  const licenses = ["MIT", "Apache-2.0", "BSD-3-Clause", "GPL-3.0"];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const license = licenses[i % licenses.length];
    const version = `${Math.floor(i / 100)}.${(i % 100) % 10}.${i % 10}`;
    const rating = (3.5 + Math.random() * 1.5).toFixed(1);
    const downloads = Math.floor(Math.random() * 50000);

    packs.push({
      id: `pack-perf-${i}`,
      turtle: `
@prefix pack: <https://gitvan.dev/pack#> .
@prefix license: <https://spdx.org/licenses#> .

:perf-pack-${i} a pack:Pack ;
  pack:name "perf-pack-${i}" ;
  pack:version "${version}" ;
  pack:description "Performance test pack ${i}" ;
  pack:category "${category}" ;
  pack:license license:${license} ;
  pack:author "Perf Team" ;
  pack:rating ${rating} ;
  pack:downloads ${downloads} ;
  pack:createdAt "2024-01-01T00:00:00Z"^^xsd:dateTime ;
  pack:keywords ( "perf" "test" "${category}" ) ;
  pack:requiresGitVan "^3.0.0" .
      `,
    });
  }

  return packs;
}

// Real-world use case scenarios
export const USE_CASES = {
  fullStack: {
    name: "Full-stack application",
    description: "Auth + API + UI + Database + Deployment",
    requiredCategories: [
      "authentication",
      "api-gateway",
      "ui-components",
      "database",
      "deployment",
    ],
    constraints: {
      license: "MIT or Apache-2.0", // No GPL
      rating: ">= 4.5",
      gitvan: "^3.0.0",
    },
  },

  microservices: {
    name: "Microservices platform",
    description: "API + Monitoring + Deployment + Testing",
    requiredCategories: ["api-gateway", "monitoring", "deployment", "testing"],
    constraints: {
      rating: ">= 4.0",
      gitvan: ">=2.0.0",
    },
  },

  enterprise: {
    name: "Enterprise application",
    description: "All components with high standards",
    requiredCategories: [
      "authentication",
      "api-gateway",
      "ui-components",
      "database",
      "monitoring",
      "security",
      "deployment",
    ],
    constraints: {
      license: "Commercial compatible",
      rating: ">= 4.7",
      downloads: ">= 10000",
      gitvan: "^3.0.0",
    },
  },
};

// Remote repository mock data
export const REMOTE_REPOSITORIES = {
  marketplace: {
    url: "https://marketplace.gitvan.dev/sparql",
    packs: [
      {
        name: "premium-auth",
        version: "1.0.0",
        rating: 5.0,
        downloads: 50000,
        license: "Commercial",
        category: "authentication",
      },
      {
        name: "enterprise-ui",
        version: "2.0.0",
        rating: 4.9,
        downloads: 40000,
        license: "MIT",
        category: "ui-components",
      },
    ],
  },

  community: {
    url: "https://community.gitvan.dev/sparql",
    packs: [
      {
        name: "community-tools",
        version: "1.5.0",
        rating: 4.3,
        downloads: 5000,
        license: "MIT",
        category: "utilities",
      },
      {
        name: "experimental-features",
        version: "0.9.0",
        rating: 3.8,
        downloads: 1000,
        license: "Apache-2.0",
        category: "experimental",
      },
    ],
  },

  privateRepo: {
    url: "https://internal.company.com/sparql",
    packs: [
      {
        name: "internal-sdk",
        version: "3.0.0",
        rating: 4.6,
        downloads: 100,
        license: "Proprietary",
        category: "sdk",
      },
    ],
  },
};

// Security test data
export const SECURITY_SCENARIOS = {
  tamperedManifest: {
    description: "Pack manifest has been modified",
    pack: {
      name: "tampered-pack",
      version: "1.0.0",
      originalHash: "abc123",
      currentHash: "def456",
      signature: "invalid-signature",
    },
  },

  outdatedSignature: {
    description: "Pack signature is valid but outdated",
    pack: {
      name: "outdated-pack",
      version: "1.0.0",
      signedAt: "2020-01-01T00:00:00Z",
      expiresAt: "2021-01-01T00:00:00Z",
      currentTime: "2026-01-09T00:00:00Z",
    },
  },

  untrustedAuthor: {
    description: "Pack from untrusted source",
    pack: {
      name: "suspicious-pack",
      version: "1.0.0",
      author: "unknown@suspicious.com",
      trustedAuthors: ["gitvan-team@gitvan.dev", "verified@company.com"],
    },
  },
};

export default {
  SAMPLE_PACKS,
  LICENSE_COMPATIBILITY,
  DEPENDENCY_GRAPH,
  USE_CASES,
  REMOTE_REPOSITORIES,
  SECURITY_SCENARIOS,
  generatePerformanceTestPacks,
};
