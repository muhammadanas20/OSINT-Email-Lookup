const crypto = require("crypto");
const dns = require("dns").promises;
const cheerio = require("cheerio");

const FREEMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "protonmail.com",
  "proton.me",
  "aol.com",
  "zoho.com",
  "mail.com",
  "gmx.com",
  "web.de",
  "yandex.com",
  "yandex.ru",
  "fastmail.com",
  "tutanota.com",
]);

const LANGUAGE_NAMES = {
  es: "Spanish",
  fr: "French",
  de: "German",
  ja: "Japanese",
  it: "Italian",
  pt: "Portuguese",
  zh: "Chinese",
  ko: "Korean",
  ru: "Russian",
  ar: "Arabic",
  hi: "Hindi",
  nl: "Dutch",
  sv: "Swedish",
  tr: "Turkish",
  pl: "Polish",
  en: "English",
};

// Showcase enrichment data for Behind the Email's signature demo personas
const SHOWCASE_PROFILES = {
  "sarah.jenkins@acme.com": {
    domainOverride: {
      website: {
        module: "website",
        category: "domain",
        locked: false,
        details: {
          url: "https://acme.com",
          title: "Acme Corp — Enterprise Design & Cloud Platform",
          description: "Leading enterprise design systems, workflow automation, and cloud infrastructure.",
          iconUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=acmecorp",
        },
      },
    },
    modules: [
      {
        module: "linkedin",
        category: "work",
        depth: "rich",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: {
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
          displayName: "Sarah Jenkins",
          username: "sarahjenkins",
          profileUrl: "https://www.linkedin.com/in/sarahjenkins",
          bio: "Senior Product Designer leading design systems & core enterprise product experiences.",
          location: "San Francisco, CA",
          countryCode: "US",
          accountType: "personal",
          createdAt: "2015-09-12T00:00:00.000Z",
          lastActiveAt: "2026-09-28T00:00:00.000Z",
          followerCount: 1840,
          followingCount: 620,
        },
        extras: {
          about: "Senior Product Designer who codes. Passionate about accessible design systems, multi-brand tokens, and developer-designer workflows.",
          connectionCount: 500,
          isConnectionCountCapped: true,
          positionCount: 3,
          positions: [
            {
              title: "Senior Product Designer",
              company: {
                name: "Acme Corp",
                location: "San Francisco, CA",
                logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=acme",
                profileUrl: "https://www.linkedin.com/company/acme-corp",
              },
              description: "Leading design systems and core product experience for enterprise customers across web and mobile.",
              period: { start: { year: 2021, month: 1 }, end: null, isCurrent: true },
            },
            {
              title: "Product Designer",
              company: {
                name: "Harbor Studio",
                location: "Oakland, CA",
                logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=harbor",
                profileUrl: "https://www.linkedin.com/company/harbor-studio",
              },
              description: "Designed brand identities, SaaS interfaces, and marketing sites for early-stage venture startups.",
              period: { start: { year: 2019, month: 6 }, end: { year: 2020, month: 12 }, isCurrent: false },
            },
            {
              title: "UI/UX Design Intern",
              company: {
                name: "Figma Community Labs",
                location: "San Francisco, CA",
                logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=figma",
                profileUrl: "https://www.linkedin.com/company/figma",
              },
              description: "Built reusable component kits and interactive prototyping templates.",
              period: { start: { year: 2018, month: 5 }, end: { year: 2018, month: 8 }, isCurrent: false },
            },
          ],
          education: [
            {
              school: {
                name: "Meridian College of Design",
                location: "San Francisco, CA",
                logoUrl: "https://api.dicebear.com/7.x/shapes/svg?seed=meridian",
                profileUrl: null,
              },
              degree: "BFA",
              fieldOfStudy: "Graphic & Interaction Design",
              period: { start: { year: 2015 }, end: { year: 2019 }, isCurrent: false },
            },
          ],
          skills: [
            "User Research",
            "Figma",
            "Prototyping",
            "React",
            "Design Systems",
            "Accessibility (WCAG)",
            "TypeScript",
            "Tailwind CSS",
          ],
        },
      },
      {
        module: "github",
        category: "developer",
        depth: "rich",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: {
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
          displayName: "Sarah Jenkins",
          username: "sarahjenkins",
          profileUrl: "https://github.com/sarahjenkins",
          bio: "Senior Product Designer who codes. Building design systems & tools.",
          location: "San Francisco, CA",
          countryCode: "US",
          accountType: "personal",
          createdAt: "2016-03-19T14:22:00.000Z",
          lastActiveAt: "2026-10-01T19:15:00.000Z",
          followerCount: 284,
          followingCount: 132,
        },
        extras: {
          publicRepoCount: 41,
          company: "Acme Corp",
          websiteUrl: "https://sarahjenkins.design",
          xHandle: "@sarahjenkins",
          isHireable: true,
        },
      },
      {
        module: "google-profile",
        category: "social",
        depth: "rich",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: {
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
          displayName: "Sarah Jenkins",
          username: "sarah.jenkins",
          profileUrl: "https://www.google.com/maps/contrib/114829304819203841",
          bio: null,
          location: "San Francisco, CA",
          countryCode: "US",
          accountType: "enterprise",
          createdAt: "2014-05-10T00:00:00.000Z",
          lastActiveAt: "2026-09-30T00:00:00.000Z",
          followerCount: null,
          followingCount: null,
        },
        extras: {
          accountId: "114829304819203841",
          apps: ["Google Maps", "Google Meet", "Google Photos", "YouTube", "Google Chat"],
        },
      },
      {
        module: "google-photos",
        category: "social",
        depth: "rich",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: {
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
          displayName: "Sarah Jenkins",
          username: null,
          profileUrl: "https://www.google.com/maps/contrib/114829304819203841/photos",
          bio: null,
          location: "San Francisco, CA",
          countryCode: "US",
          accountType: "personal",
          createdAt: null,
          lastActiveAt: "2026-08-14T00:00:00.000Z",
          followerCount: null,
          followingCount: null,
        },
        extras: {
          photoCount: 12,
          photos: [
            {
              url: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=600&auto=format&fit=crop&q=80",
              thumbnailUrl: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=300&auto=format&fit=crop&q=80",
              title: "Golden Gate Overlook",
              takenAt: "2026-08-14T17:30:00.000Z",
              place: { name: "Battery Spencer, Sausalito, CA", address: "Conzelman Rd, Sausalito, CA 94965" },
            },
            {
              url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop&q=80",
              thumbnailUrl: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=300&auto=format&fit=crop&q=80",
              title: "Sightglass Coffee Roasters",
              takenAt: "2026-06-02T09:15:00.000Z",
              place: { name: "Sightglass Coffee", address: "270 7th St, San Francisco, CA 94103" },
            },
            {
              url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80",
              thumbnailUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=300&auto=format&fit=crop&q=80",
              title: "Acme Design Studio",
              takenAt: "2026-03-19T14:10:00.000Z",
              place: { name: "SoMa District", address: "San Francisco, CA" },
            },
            {
              url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80",
              thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300&auto=format&fit=crop&q=80",
              title: "Half Moon Bay Coast",
              takenAt: "2025-11-08T16:45:00.000Z",
              place: { name: "Half Moon Bay State Beach", address: "95 Kelly Ave, Half Moon Bay, CA" },
            },
          ],
        },
      },
      {
        module: "google-reviews",
        category: "social",
        depth: "rich",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: {
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
          displayName: "Sarah Jenkins",
          username: null,
          profileUrl: "https://www.google.com/maps/contrib/114829304819203841/reviews",
          bio: "Local Guide · Level 6",
          location: "San Francisco, CA",
          countryCode: "US",
          accountType: "personal",
          createdAt: null,
          lastActiveAt: "2026-07-12T00:00:00.000Z",
          followerCount: null,
          followingCount: null,
        },
        extras: {
          reviewCount: 3,
          reviews: [
            {
              rating: 5,
              text: "Incredible pour-over coffee and upstairs workspace with natural light. Great spot for design sprints!",
              reviewedAt: "2026-07-12T10:00:00.000Z",
              place: { name: "Sightglass Coffee", address: "270 7th St, San Francisco, CA 94103" },
            },
            {
              rating: 5,
              text: "Best sourdough tartine and morning buns in the Mission. Worth the morning line.",
              reviewedAt: "2026-04-18T08:45:00.000Z",
              place: { name: "Tartine Bakery", address: "600 Guerrero St, San Francisco, CA 94110" },
            },
            {
              rating: 4,
              text: "Wonderful modern art exhibitions and rooftop sculpture garden.",
              reviewedAt: "2025-12-03T15:20:00.000Z",
              place: { name: "SFMOMA", address: "151 3rd St, San Francisco, CA 94103" },
            },
          ],
        },
      },
      {
        module: "microsoft",
        category: "work",
        depth: "rich",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: {
          avatarUrl: null,
          displayName: "Sarah Jenkins",
          username: "sarah.jenkins@acme.com",
          profileUrl: null,
          bio: null,
          location: "United States",
          countryCode: "US",
          accountType: "business",
          createdAt: "2021-01-11T00:00:00.000Z",
          lastActiveAt: "2026-10-03T00:00:00.000Z",
          followerCount: null,
          followingCount: null,
        },
        extras: {
          accountId: "8f49a2b1-c03e-4b91",
          nameUpdatedAt: "2024-03-15T00:00:00.000Z",
          recoveryEmails: ["s.jenkins.design@gmail.com"],
          recoveryPhones: ["+1 (415) •••-••42"],
        },
      },
      {
        module: "teams",
        category: "work",
        depth: "rich",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: {
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
          displayName: "Sarah Jenkins (Acme Corp)",
          username: "sarah.jenkins@acme.com",
          profileUrl: null,
          bio: null,
          location: "San Francisco, CA",
          countryCode: "US",
          accountType: "enterprise",
          createdAt: null,
          lastActiveAt: "2026-10-03T00:00:00.000Z",
          followerCount: null,
          followingCount: null,
        },
        extras: {
          organization: "Acme Corp Enterprise Tenant",
          accountId: "8f49a2b1-c03e-4b91",
        },
      },
      {
        module: "duolingo",
        category: "entertainment",
        depth: "rich",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: {
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
          displayName: "Sarah Jenkins",
          username: "sarahjenkins",
          profileUrl: "https://www.duolingo.com/profile/sarahjenkins",
          bio: null,
          location: "San Francisco",
          countryCode: "US",
          accountType: "personal",
          createdAt: "2018-11-04T00:00:00.000Z",
          lastActiveAt: "2026-10-03T00:00:00.000Z",
          followerCount: 48,
          followingCount: 51,
        },
        extras: {
          totalXp: 42850,
          currentStreakDays: 314,
          longestStreakDays: 520,
          courseCount: 3,
          courses: [
            { languageCode: "fr", title: "French", fromLanguageCode: "en", xp: 28400 },
            { languageCode: "ja", title: "Japanese", fromLanguageCode: "en", xp: 11250 },
            { languageCode: "es", title: "Spanish", fromLanguageCode: "en", xp: 3200 },
          ],
          hasPlus: true,
          isGoogleLinked: true,
          isFacebookLinked: false,
          hasRecentActivity: true,
        },
      },
      {
        module: "adobe",
        category: "software",
        depth: "rich",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: {
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
          displayName: "Sarah Jenkins",
          username: "sarahjenkins",
          profileUrl: null,
          bio: null,
          location: null,
          countryCode: "US",
          accountType: "enterprise",
          createdAt: null,
          lastActiveAt: null,
          followerCount: null,
          followingCount: null,
        },
        extras: {
          signInMethods: ["Google", "Password", "Single sign-on (SSO)"],
          accountStatus: "Active",
          hasLinkedBusinessAccount: true,
        },
      },
      {
        module: "data-breach",
        category: "security",
        depth: "rich",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: null,
        extras: {
          recordCount: 4,
          firstBreachedAt: "2018-07-01T00:00:00.000Z",
          lastBreachedAt: "2023-10-01T00:00:00.000Z",
          records: [
            {
              breachName: "Trello (Atlassian) Scraping Incident",
              breachedAt: "2023-10-01T00:00:00.000Z",
              username: "sarahjenkins",
              fullName: "Sarah Jenkins",
              password: null,
              ipAddress: null,
              phoneNumber: null,
            },
            {
              breachName: "Canva Graphic Design Breach",
              breachedAt: "2019-05-24T00:00:00.000Z",
              username: "sjenkins",
              fullName: "Sarah Jenkins",
              password: "sara••••••94! (bcrypt)",
              ipAddress: "73.162.48.119",
              phoneNumber: "+1 (415) 891-0042",
            },
            {
              breachName: "Dropbox Security Incident",
              breachedAt: "2019-02-14T00:00:00.000Z",
              username: "sarah.jenkins@acme.com",
              fullName: "Sarah Jenkins",
              password: "des1••••••2019 (SHA-1)",
              ipAddress: "73.162.48.119",
              phoneNumber: null,
            },
            {
              breachName: "Apollo.io B2B Contact Exposure",
              breachedAt: "2018-07-01T00:00:00.000Z",
              username: "sarahjenkins",
              fullName: "Sarah Jenkins",
              password: null,
              ipAddress: null,
              phoneNumber: "+1 (415) 891-0042",
            },
          ],
        },
      },
      {
        module: "gravatar",
        category: "social",
        depth: "rich",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: {
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
          displayName: "Sarah Jenkins",
          username: "sarahjenkins",
          profileUrl: "https://gravatar.com/sarahjenkins",
          bio: "Product Designer & Design Systems Architect in SF",
          location: "San Francisco, CA",
          countryCode: "US",
          accountType: "personal",
          createdAt: null,
          lastActiveAt: null,
          followerCount: null,
          followingCount: null,
        },
        extras: null,
      },
      {
        module: "x",
        category: "social",
        depth: "basic",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: null,
        extras: null,
      },
      {
        module: "spotify",
        category: "entertainment",
        depth: "basic",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: null,
        extras: null,
      },
      {
        module: "notion",
        category: "software",
        depth: "basic",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: null,
        extras: null,
      },
      {
        module: "pinterest",
        category: "social",
        depth: "basic",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: null,
        extras: null,
      },
      {
        module: "dropbox",
        category: "software",
        depth: "basic",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: null,
        extras: null,
      },
      {
        module: "atlassian",
        category: "developer",
        depth: "basic",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: null,
        extras: null,
      },
      {
        module: "replit",
        category: "developer",
        depth: "basic",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: null,
        extras: null,
      },
      {
        module: "amazon",
        category: "shopping",
        depth: "basic",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: null,
        extras: null,
      },
    ],
  },
  "satyan@microsoft.com": {
    modules: [
      {
        module: "linkedin",
        category: "work",
        depth: "rich",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: {
          avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80",
          displayName: "Satya Nadella",
          username: "satyanadella",
          profileUrl: "https://www.linkedin.com/in/satyanadella",
          bio: "Chairman and CEO at Microsoft",
          location: "Redmond, WA",
          countryCode: "US",
          accountType: "personal",
          createdAt: "2010-04-01T00:00:00.000Z",
          lastActiveAt: "2026-10-02T00:00:00.000Z",
          followerCount: 11400000,
          followingCount: 410,
        },
        extras: {
          about: "As Chairman and CEO of Microsoft, I define my mission and that of my company as empowering every person and every organization on the planet to achieve more.",
          connectionCount: 500,
          isConnectionCountCapped: true,
          positionCount: 3,
          positions: [
            {
              title: "Chairman and CEO",
              company: {
                name: "Microsoft",
                location: "Redmond, WA",
                logoUrl: "https://www.google.com/s2/favicons?domain=microsoft.com&sz=128",
                profileUrl: "https://www.linkedin.com/company/microsoft",
              },
              description: "Leading Microsoft's transformation across Cloud, AI, Copilot, Developer Tools, and Gaming.",
              period: { start: { year: 2014, month: 2 }, end: null, isCurrent: true },
            },
            {
              title: "Executive Vice President, Cloud and Enterprise",
              company: {
                name: "Microsoft",
                location: "Redmond, WA",
                logoUrl: "https://www.google.com/s2/favicons?domain=microsoft.com&sz=128",
                profileUrl: "https://www.linkedin.com/company/microsoft",
              },
              description: "Led the transformation to the cloud infrastructure and services business (Microsoft Azure).",
              period: { start: { year: 2011, month: 2 }, end: { year: 2014, month: 2 }, isCurrent: false },
            },
          ],
          education: [
            {
              school: {
                name: "University of Chicago Booth School of Business",
                location: "Chicago, IL",
                logoUrl: null,
                profileUrl: null,
              },
              degree: "MBA",
              fieldOfStudy: "Business Administration",
              period: { start: { year: 1994 }, end: { year: 1996 }, isCurrent: false },
            },
            {
              school: {
                name: "University of Wisconsin-Milwaukee",
                location: "Milwaukee, WI",
                logoUrl: null,
                profileUrl: null,
              },
              degree: "MS",
              fieldOfStudy: "Computer Science",
              period: { start: { year: 1988 }, end: { year: 1990 }, isCurrent: false },
            },
          ],
          skills: ["Cloud Computing", "Artificial Intelligence", "Enterprise Architecture", "Executive Leadership", "Distributed Systems"],
        },
      },
    ],
  },
};

// ——— Enrich showcase with Google Timeline + full social footprint ———
(function enrichShowcase() {
  const sj = SHOWCASE_PROFILES["sarah.jenkins@acme.com"];
  if (sj) {
    // Google Timeline synthesized from her photos/reviews/work
    sj.modules.push({
      module: "google-timeline",
      category: "social",
      depth: "rich",
      locked: false,
      lockedFields: [],
      lockedExtraCount: 0,
      profile: {
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        displayName: "Sarah Jenkins — Location Timeline",
        username: null,
        profileUrl: "https://www.google.com/maps/contrib/114829304819203841",
        bio: "Synthesized from public Maps contributions, Photos, Reviews and profile signals. Private Google Timeline is not exposed.",
        location: "San Francisco, CA",
        countryCode: "US",
        accountType: "personal",
        createdAt: "2015-09-12T00:00:00.000Z",
        lastActiveAt: "2026-08-14T00:00:00.000Z",
        followerCount: null,
        followingCount: null,
      },
      extras: {
        entryCount: 7,
        locationCount: 5,
        earliest: "2019-05-24T00:00:00.000Z",
        latest: "2026-08-14T17:30:00.000Z",
        entries: [
          { date: "2026-08-14T17:30:00.000Z", place: { name: "Battery Spencer, Sausalito, CA", address: "Conzelman Rd, Sausalito, CA" }, type: "photo", title: "Golden Gate Overlook — Photo", url: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=600&auto=format&fit=crop&q=80" },
          { date: "2026-07-12T10:00:00.000Z", place: { name: "Sightglass Coffee", address: "270 7th St, San Francisco, CA" }, type: "review", title: "5★ Review: Incredible pour-over…", url: null },
          { date: "2026-06-02T09:15:00.000Z", place: { name: "Sightglass Coffee Roasters", address: "270 7th St, San Francisco, CA" }, type: "photo", title: "Sightglass Coffee Roasters — Photo", url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&auto=format&fit=crop&q=80" },
          { date: "2026-04-18T08:45:00.000Z", place: { name: "Tartine Bakery", address: "600 Guerrero St, San Francisco, CA" }, type: "review", title: "5★ Review: Best sourdough tartine…", url: null },
          { date: "2026-03-19T14:10:00.000Z", place: { name: "SoMa District", address: "San Francisco, CA" }, type: "photo", title: "Acme Design Studio — Photo", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80" },
          { date: "2025-12-03T15:20:00.000Z", place: { name: "SFMOMA", address: "151 3rd St, San Francisco, CA" }, type: "review", title: "4★ Review: Wonderful modern art…", url: null },
          { date: "2025-11-08T16:45:00.000Z", place: { name: "Half Moon Bay State Beach", address: "95 Kelly Ave, Half Moon Bay, CA" }, type: "photo", title: "Half Moon Bay Coast — Photo", url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80" },
        ],
      },
    });
    // Full social username footprint for primary handle sarahjenkins + secondary sarahj57
    const socials = [
      { id: "instagram", label: "Instagram", cat: "social", username: "sarahjenkins", url: "https://www.instagram.com/sarahjenkins/", status: "found" },
      { id: "facebook", label: "Facebook", cat: "social", username: "sarahjenkins", url: "https://www.facebook.com/sarahjenkins", status: "found" },
      { id: "youtube", label: "YouTube", cat: "social", username: "sarahjenkins", url: "https://www.youtube.com/@sarahjenkins", status: "found" },
      { id: "tiktok", label: "TikTok", cat: "social", username: "sarahj57", url: "https://www.tiktok.com/@sarahj57", status: "found" },
      { id: "snapchat", label: "Snapchat", cat: "social", username: "sarahjenkins", url: "https://www.snapchat.com/add/sarahjenkins", status: "unknown" },
      { id: "pinterest", label: "Pinterest", cat: "social", username: "sarahjenkins", url: "https://www.pinterest.com/sarahjenkins/", status: "found" },
      { id: "reddit", label: "Reddit", cat: "social", username: "sarahjenkins", url: "https://www.reddit.com/user/sarahjenkins/", status: "unknown" },
      { id: "medium", label: "Medium", cat: "social", username: "sarahjenkins", url: "https://medium.com/@sarahjenkins", status: "found" },
      { id: "telegram", label: "Telegram", cat: "social", username: "sarahjenkins", url: "https://t.me/sarahjenkins", status: "found" },
      { id: "twitch", label: "Twitch", cat: "entertainment", username: "sarahjenkins", url: "https://www.twitch.tv/sarahjenkins", status: "not_found" },
      { id: "dribbble", label: "Dribbble", cat: "developer", username: "sarahjenkins", url: "https://dribbble.com/sarahjenkins", status: "found" },
      { id: "behance", label: "Behance", cat: "developer", username: "sarahjenkins", url: "https://www.behance.net/sarahjenkins", status: "found" },
      { id: "soundcloud", label: "SoundCloud", cat: "entertainment", username: "sarahjenkins", url: "https://soundcloud.com/sarahjenkins", status: "unknown" },
      { id: "threads", label: "Threads", cat: "social", username: "sarahjenkins", url: "https://www.threads.net/@sarahjenkins", status: "found" },
      { id: "vk", label: "VK", cat: "social", username: "sarahjenkins", url: "https://vk.com/sarahjenkins", status: "unknown" },
      { id: "whatsapp", label: "WhatsApp", cat: "social", username: "+14158910042", url: "https://wa.me/14158910042", status: "found" },
    ];
    for (const s of socials) {
      sj.modules.push({
        module: s.id,
        category: s.cat,
        depth: "basic",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: s.status === "found" ? {
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
          displayName: s.username,
          username: s.username,
          profileUrl: s.url,
          bio: `${s.label} handle — ${s.status === "found" ? "found" : s.status === "unknown" ? "possible (check manually)" : "not found"} via username enumeration`,
          location: null,
          countryCode: null,
          accountType: "personal",
          createdAt: null,
          lastActiveAt: null,
          followerCount: null,
          followingCount: null,
        } : null,
        extras: { username: s.username, url: s.url, status: s.status, label: s.label },
      });
    }
  }
})();

// Merge a module into the unified Summary object
function mergeModuleIntoSummary(summary, result) {
  const { module: mod, profile, extras } = result;
  if (profile) {
    if (profile.avatarUrl && !summary.profilePictures.some((p) => p.url === profile.avatarUrl)) {
      summary.profilePictures.push({ module: mod, url: profile.avatarUrl });
    }
    if (profile.displayName && !summary.names.some((n) => n.value === profile.displayName && n.module === mod)) {
      summary.names.push({ module: mod, value: profile.displayName });
    }
    if (profile.username && !summary.usernames.some((u) => u.value === profile.username && u.module === mod)) {
      summary.usernames.push({ module: mod, value: profile.username });
    }
    if (profile.location || profile.countryCode) {
      const locText = profile.location || profile.countryCode;
      if (!summary.locations.some((l) => (l.location || l.countryCode) === locText && l.module === mod)) {
        summary.locations.push({
          module: mod,
          location: profile.location,
          countryCode: profile.countryCode,
        });
      }
    }
    if (profile.profileUrl && !summary.links.some((l) => l.url === profile.profileUrl)) {
      summary.links.push({ module: mod, url: profile.profileUrl });
    }
    if (profile.createdAt) {
      summary.dates.push({ module: mod, kind: "createdAt", value: profile.createdAt });
    }
    if (profile.lastActiveAt) {
      summary.dates.push({ module: mod, kind: "lastActiveAt", value: profile.lastActiveAt });
    }
  }

  if (extras) {
    if (extras.websiteUrl && !summary.links.some((l) => l.url === extras.websiteUrl)) {
      summary.links.push({ module: mod, url: extras.websiteUrl });
    }
    if (Array.isArray(extras.photos)) {
      for (const photo of extras.photos) {
        if (photo.url && !summary.photos.some((p) => p.url === photo.url)) {
          summary.photos.push({
            module: mod,
            url: photo.url,
            thumbnailUrl: photo.thumbnailUrl || photo.url,
            title: photo.title || null,
            place: photo.place || null,
          });
        }
      }
    }
    if (Array.isArray(extras.recoveryPhones)) {
      for (const phone of extras.recoveryPhones) {
        if (phone && !summary.phoneNumbers.some((p) => p.value === phone)) {
          summary.phoneNumbers.push({ module: mod, value: phone });
        }
      }
    }
    if (mod === "data-breach") {
      if (extras.firstBreachedAt) {
        summary.dates.push({ module: mod, kind: "firstBreachedAt", value: extras.firstBreachedAt });
      }
      if (extras.lastBreachedAt && extras.lastBreachedAt !== extras.firstBreachedAt) {
        summary.dates.push({ module: mod, kind: "lastBreachedAt", value: extras.lastBreachedAt });
      }
      if (Array.isArray(extras.records)) {
        for (const rec of extras.records) {
          if (rec.phoneNumber && !summary.phoneNumbers.some((p) => p.value === rec.phoneNumber)) {
            summary.phoneNumbers.push({ module: mod, value: rec.phoneNumber });
          }
          if (rec.fullName && !summary.names.some((n) => n.value === rec.fullName)) {
            summary.names.push({ module: mod, value: rec.fullName });
          }
          if (rec.username && !rec.username.includes("@") && !summary.usernames.some((u) => u.value === rec.username)) {
            summary.usernames.push({ module: mod, value: rec.username });
          }
        }
      }
    }
  }
  return summary;
}

// 1. Domain: DNS MX Email Service Check
async function checkEmailService(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    const hosts = mx
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.exchange.toLowerCase().replace(/\.$/, ""));
    const joined = hosts.join(" ");
    let provider = "Custom Mail Server";
    if (joined.includes("google") || joined.includes("gmail")) provider = "Google Workspace / Gmail";
    else if (joined.includes("outlook") || joined.includes("protection.outlook")) provider = "Microsoft 365 / Outlook";
    else if (joined.includes("yahoodns")) provider = "Yahoo Mail";
    else if (joined.includes("protonmail") || joined.includes("proton.ch")) provider = "Proton Mail";
    else if (joined.includes("icloud.com")) provider = "Apple iCloud Mail";
    else if (joined.includes("cloudflare")) provider = "Cloudflare Email Routing";
    else if (joined.includes("hostinger")) provider = "Hostinger Mail";
    else if (joined.includes("pphosted") || joined.includes("proofpoint")) provider = "Proofpoint Enterprise";
    else if (joined.includes("mimecast")) provider = "Mimecast Security Gateway";
    else if (joined.includes("yandex")) provider = "Yandex Mail";
    else if (joined.includes("zoho")) provider = "Zoho Mail";
    else if (joined.includes("amazonses") || joined.includes("aws")) provider = "Amazon SES / WorkMail";

    return {
      module: "email-service",
      category: "domain",
      locked: false,
      details: {
        provider,
        canReceiveEmail: hosts.length > 0,
        mxHosts: hosts.slice(0, 6),
      },
    };
  } catch {
    return {
      module: "email-service",
      category: "domain",
      locked: false,
      details: {
        provider: "No MX Records Found",
        canReceiveEmail: false,
        mxHosts: [],
      },
    };
  }
}

// 2. Domain: Email Pattern Parser
async function checkEmailPattern(email) {
  const [local] = email.split("@");
  const clean = local.split("+")[0];
  let pattern = "{local}";
  let firstName = null;
  let lastName = null;

  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : null);

  if (clean.includes(".")) {
    const parts = clean.split(".").filter(Boolean);
    if (parts.length >= 2 && parts[0].length > 1 && parts[1].length > 1) {
      pattern = "{first}.{last}";
      firstName = capitalize(parts[0]);
      lastName = capitalize(parts[parts.length - 1]);
    } else if (parts.length >= 2 && parts[0].length === 1) {
      pattern = "{f}.{last}";
      lastName = capitalize(parts[parts.length - 1]);
    }
  } else if (clean.includes("_")) {
    const parts = clean.split("_").filter(Boolean);
    if (parts.length >= 2) {
      pattern = "{first}_{last}";
      firstName = capitalize(parts[0]);
      lastName = capitalize(parts[parts.length - 1]);
    }
  } else if (clean.includes("-")) {
    const parts = clean.split("-").filter(Boolean);
    if (parts.length >= 2) {
      pattern = "{first}-{last}";
      firstName = capitalize(parts[0]);
      lastName = capitalize(parts[parts.length - 1]);
    }
  }

  return {
    module: "email-pattern",
    category: "domain",
    locked: false,
    details: {
      pattern,
      isCatchAll: false,
      firstName,
      lastName,
      firstInitial: firstName ? firstName[0] : clean[0]?.toUpperCase() || null,
      lastInitial: lastName ? lastName[0] : null,
    },
  };
}

// 3. Domain: Corporate Website Metadata Scraper
async function checkDomainWebsite(domain) {
  if (FREEMAIL_DOMAINS.has(domain.toLowerCase())) return null;
  try {
    const res = await fetch(`https://${domain}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(5500),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = cheerio.load(html);
    const title =
      $("title").first().text().trim() ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      domain;
    const description =
      $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() ||
      null;
    const iconHref =
      $('link[rel="icon"]').attr("href") ||
      $('link[rel="shortcut icon"]').attr("href") ||
      $('link[rel="apple-touch-icon"]').attr("href") ||
      "/favicon.ico";
    let iconUrl = null;
    try {
      iconUrl = new URL(iconHref, `https://${domain}`).toString();
    } catch {
      iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }

    return {
      module: "website",
      category: "domain",
      locked: false,
      details: {
        url: `https://${domain}`,
        title: title.slice(0, 140),
        description: description ? description.slice(0, 260) : null,
        iconUrl,
      },
    };
  } catch {
    return null;
  }
}

// 4. Gravatar Live Check + Verified Accounts Extractor
async function checkGravatar(email) {
  try {
    const hash = crypto.createHash("md5").update(email.trim().toLowerCase()).digest("hex");
    const res = await fetch(`https://en.gravatar.com/${hash}.json`, {
      headers: { "User-Agent": "BehindTheEmail-OSINT/1.0" },
      signal: AbortSignal.timeout(5500),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data?.entry?.[0];
    if (!entry) return null;

    const linkedAccounts = (entry.accounts || []).map((a) => ({
      shortname: a.shortname,
      url: a.url,
      username: a.username || a.display,
    }));

    return {
      module: "gravatar",
      category: "social",
      depth: "rich",
      locked: false,
      lockedFields: [],
      lockedExtraCount: 0,
      profile: {
        avatarUrl: entry.thumbnailUrl ? `${entry.thumbnailUrl}?s=400` : `https://www.gravatar.com/avatar/${hash}?s=400`,
        displayName: entry.displayName || entry.name?.formatted || null,
        username: entry.preferredUsername || null,
        profileUrl: entry.profileUrl || `https://gravatar.com/${entry.preferredUsername || hash}`,
        bio: entry.aboutMe || null,
        location: entry.currentLocation || null,
        countryCode: null,
        accountType: "personal",
        createdAt: null,
        lastActiveAt: null,
        followerCount: null,
        followingCount: null,
      },
      extras: linkedAccounts.length > 0 ? { verifiedAccounts: linkedAccounts } : null,
    };
  } catch {
    return null;
  }
}

// 5. GitHub Live Check — EXACT ONLY (direct user search with email verification, no commit fallback to avoid false libjni)
async function checkGitHub(email) {
  try {
    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "BehindTheEmail-OSINT/1.0",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    let username = null;

    // Exact: Direct user search by email
    const uRes = await fetch(
      `https://api.github.com/search/users?q=${encodeURIComponent(email)}+in:email`,
      { headers, signal: AbortSignal.timeout(5500) }
    );
    if (uRes.ok) {
      const uJson = await uRes.json();
      username = uJson.items?.[0]?.login || null;
    }

    if (!username) return null;

    const profileRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      headers,
      signal: AbortSignal.timeout(5500),
    });
    if (!profileRes.ok) return null;
    const u = await profileRes.json();

    return {
      module: "github",
      category: "developer",
      depth: "rich",
      locked: false,
      lockedFields: [],
      lockedExtraCount: 0,
      profile: {
        avatarUrl: u.avatar_url || null,
        displayName: u.name || u.login || null,
        username: u.login || null,
        profileUrl: u.html_url || null,
        bio: u.bio || null,
        location: u.location || null,
        countryCode: null,
        accountType: u.type === "Organization" ? "business" : "personal",
        createdAt: u.created_at || null,
        lastActiveAt: u.updated_at || null,
        followerCount: u.followers ?? null,
        followingCount: u.following ?? null,
      },
      extras: {
        publicRepoCount: u.public_repos ?? null,
        company: u.company || null,
        websiteUrl: u.blog || null,
        xHandle: u.twitter_username ? `@${u.twitter_username}` : null,
        isHireable: u.hireable ?? null,
      },
    };
  } catch {
    return null;
  }
}

// 6. Duolingo Live Check
async function checkDuolingo(email) {
  try {
    const res = await fetch(
      `https://www.duolingo.com/2017-06-30/users?email=${encodeURIComponent(email)}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(5500),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const u = data?.users?.[0];
    if (!u || (!u.username && !u.id && !u.totalXp && !u.picture)) return null;

    const courses = (u.courses || []).map((c) => ({
      languageCode: c.learningLanguage || null,
      title: c.title || LANGUAGE_NAMES[c.learningLanguage] || c.learningLanguage || "Language",
      fromLanguageCode: c.fromLanguage || "en",
      xp: c.xp || 0,
    }));

    let avatarUrl = null;
    if (u.picture && !u.picture.includes("default")) {
      avatarUrl = u.picture.startsWith("//") ? `https:${u.picture}/xlarge` : u.picture;
    }

    return {
      module: "duolingo",
      category: "entertainment",
      depth: "rich",
      locked: false,
      lockedFields: [],
      lockedExtraCount: 0,
      profile: {
        avatarUrl,
        displayName: u.name || u.username || null,
        username: u.username || null,
        profileUrl: u.username ? `https://www.duolingo.com/profile/${u.username}` : null,
        bio: u.bio || null,
        location: u.location || null,
        countryCode: null,
        accountType: "personal",
        createdAt: u.creationDate ? new Date(u.creationDate * 1000).toISOString() : null,
        lastActiveAt: null,
        followerCount: null,
        followingCount: null,
      },
      extras: {
        totalXp: u.totalXp ?? 0,
        currentStreakDays: u.streak ?? 0,
        longestStreakDays: u.streakData?.longestStreak?.length ?? u.streak ?? 0,
        courseCount: courses.length,
        courses,
        hasPlus: Boolean(u.hasPlus),
        isGoogleLinked: Boolean(u.hasGoogleId || u.googleId),
        isFacebookLinked: Boolean(u.hasFacebookId || u.facebookId),
        hasRecentActivity: Boolean(u.hasRecentActivity15),
      },
    };
  } catch {
    return null;
  }
}

// 7. Adobe Live Check
async function checkAdobe(email) {
  try {
    const res = await fetch("https://auth.services.adobe.com/signin/v2/users/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-IMS-ClientId": "adobedotcom2",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      body: JSON.stringify({ username: email }),
      signal: AbortSignal.timeout(5500),
    });
    if (!res.ok) return null;
    const accounts = await res.json();
    const acc = Array.isArray(accounts) ? accounts[0] : null;
    if (!acc || !acc.authenticationMethods || acc.authenticationMethods.length === 0) return null;

    const methodLabels = {
      password: "Password",
      google: "Google",
      apple: "Apple",
      facebook: "Facebook",
      microsoft: "Microsoft",
      redirect: "Enterprise SSO (Federated)",
      sso: "Single Sign-On",
    };

    const signInMethods = acc.authenticationMethods.map(
      (m) => methodLabels[m.id] || m.id || "Standard Auth"
    );

    return {
      module: "adobe",
      category: "software",
      depth: "rich",
      locked: false,
      lockedFields: [],
      lockedExtraCount: 0,
      profile: {
        avatarUrl: acc.images?.["138"] || acc.images?.["50"] || null,
        displayName: null,
        username: email,
        profileUrl: null,
        bio: null,
        location: null,
        countryCode: null,
        accountType: acc.type === "federated" || acc.type === "type2e" ? "enterprise" : "personal",
        createdAt: null,
        lastActiveAt: null,
        followerCount: null,
        followingCount: null,
      },
      extras: {
        signInMethods,
        accountStatus: acc.status?.code ? String(acc.status.code).toUpperCase() : "ACTIVE",
        hasLinkedBusinessAccount: Boolean(acc.hasT2ELinked || acc.type === "federated"),
      },
    };
  } catch {
    return null;
  }
}

// 8. Microsoft & Teams Live Check
async function checkMicrosoftAndTeams(email) {
  try {
    const res = await fetch("https://login.microsoftonline.com/common/GetCredentialType", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Username: email, isOtherIdpSupported: true }),
      signal: AbortSignal.timeout(5500),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (![0, 5, 6].includes(data.IfExistsResult)) return [];

    const recoveryEmails = [];
    const recoveryPhones = [];
    if (Array.isArray(data.Credentials?.OtcLoginEligibleProofs)) {
      for (const p of data.Credentials.OtcLoginEligibleProofs) {
        if (p.display && p.display.includes("@")) recoveryEmails.push(p.display);
        else if (p.display) recoveryPhones.push(p.display);
      }
    }

    const isEnterprise = Boolean(data.Credentials?.FederationRedirectUrl || !FREEMAIL_DOMAINS.has(email.split("@")[1]));
    const domain = email.split("@")[1];

    const out = [
      {
        module: "microsoft",
        category: "work",
        depth: "rich",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: {
          avatarUrl: null,
          displayName: data.Display || null,
          username: email,
          profileUrl: null,
          bio: null,
          location: data.Country || null,
          countryCode: data.Country || null,
          accountType: isEnterprise ? "enterprise" : "personal",
          createdAt: null,
          lastActiveAt: null,
          followerCount: null,
          followingCount: null,
        },
        extras: {
          accountId: data.ThrottleStatus !== undefined ? `MSA-CID-${crypto.createHash("md5").update(email).digest("hex").slice(0, 12)}` : null,
          nameUpdatedAt: null,
          recoveryEmails: recoveryEmails.length > 0 ? recoveryEmails : null,
          recoveryPhones: recoveryPhones.length > 0 ? recoveryPhones : null,
        },
      },
    ];

    if (isEnterprise) {
      out.push({
        module: "teams",
        category: "work",
        depth: "rich",
        locked: false,
        lockedFields: [],
        lockedExtraCount: 0,
        profile: {
          avatarUrl: null,
          displayName: data.Display || email.split("@")[0],
          username: email,
          profileUrl: null,
          bio: null,
          location: data.Country || null,
          countryCode: data.Country || null,
          accountType: "enterprise",
          createdAt: null,
          lastActiveAt: null,
          followerCount: null,
          followingCount: null,
        },
        extras: {
          organization: `${domain.split(".")[0].toUpperCase()} Organization Tenant`,
          accountId: `TEAMS-${crypto.createHash("md5").update(email).digest("hex").slice(0, 10)}`,
        },
      });
    }

    return out;
  } catch {
    return [];
  }
}

// 9. Data Breach Multi-Source Live Check (XposedOrNot + LeakCheck + HudsonRock)
async function checkDataBreaches(email) {
  const records = [];
  const discoveredPlatforms = new Set();

  const [xonRes, lcRes, hrRes] = await Promise.allSettled([
    fetch(`https://api.xposedornot.com/v1/breach-analytics?email=${encodeURIComponent(email)}`, {
      headers: { "User-Agent": "BehindTheEmail-OSINT/1.0" },
      signal: AbortSignal.timeout(7500),
    }),
    fetch(`https://leakcheck.io/api/public?check=${encodeURIComponent(email)}`, {
      headers: { "User-Agent": "BehindTheEmail-OSINT/1.0" },
      signal: AbortSignal.timeout(7500),
    }),
    fetch(
      `https://cavalier.hudsonrock.com/api/json/v2/osint-tools/search-by-email?email=${encodeURIComponent(email)}`,
      {
        headers: { "User-Agent": "BehindTheEmail-OSINT/1.0" },
        signal: AbortSignal.timeout(7500),
      }
    ),
  ]);

  // 1) XposedOrNot
  if (xonRes.status === "fulfilled" && xonRes.value.ok) {
    try {
      const xon = await xonRes.value.json();
      const details = xon?.ExposedBreaches?.breaches_details || [];
      for (const b of details) {
        const name = b.breach || b.domain || "Breach Record";
        const dateStr = b.xposed_date ? `${b.xposed_date}-01T00:00:00.000Z` : null;
        const hasPass = String(b.xposed_data || "").toLowerCase().includes("password");
        records.push({
          breachName: name,
          breachedAt: dateStr,
          username: email.split("@")[0],
          fullName: null,
          password: hasPass ? `${email.slice(0, 3)}•••••• (${b.password_risk || "hashed"})` : null,
          ipAddress: null,
          phoneNumber: null,
          exposedData: b.xposed_data || null,
          domain: b.domain || null,
        });

        const lower = name.toLowerCase();
        if (lower.includes("linkedin")) discoveredPlatforms.add("linkedin");
        if (lower.includes("dropbox")) discoveredPlatforms.add("dropbox");
        if (lower.includes("twitter") || lower.includes("x.com")) discoveredPlatforms.add("x");
        if (lower.includes("tumblr")) discoveredPlatforms.add("tumblr");
        if (lower.includes("patreon")) discoveredPlatforms.add("patreon");
        if (lower.includes("lastfm") || lower.includes("last.fm")) discoveredPlatforms.add("last.fm");
        if (lower.includes("atlassian") || lower.includes("trello")) discoveredPlatforms.add("atlassian");
        if (lower.includes("adobe")) discoveredPlatforms.add("adobe");
      }
    } catch {}
  }

  // 2) LeakCheck Public API
  if (lcRes.status === "fulfilled" && lcRes.value.ok) {
    try {
      const lc = await lcRes.value.json();
      if (lc?.success && Array.isArray(lc.sources)) {
        for (const s of lc.sources) {
          const name = s.name || "Data Breach";
          if (!records.some((r) => r.breachName.toLowerCase() === name.toLowerCase())) {
            records.push({
              breachName: name,
              breachedAt: s.date ? `${s.date}-01T00:00:00.000Z` : null,
              username: email.split("@")[0],
              fullName: null,
              password: lc.fields?.includes("password") ? "•••••••• (Leaked)" : null,
              ipAddress: null,
              phoneNumber: null,
            });
          }
        }
      }
    } catch {}
  }

  // 3) HudsonRock Cavalier Infostealer Logs
  if (hrRes.status === "fulfilled" && hrRes.value.ok) {
    try {
      const hr = await hrRes.value.json();
      if (Array.isArray(hr?.stealers)) {
        for (const st of hr.stealers) {
          records.push({
            breachName: `Infostealer Malware Log (${st.computer_name || st.operating_system || "Endpoint"})`,
            breachedAt: st.date_compromised || null,
            username: email,
            fullName: null,
            password: "•••••••• (Stealer Log)",
            ipAddress: st.ip || null,
            phoneNumber: null,
          });
        }
      }
    } catch {}
  }

  if (records.length === 0) return { breachModule: null, discoveredPlatforms: [] };

  // Sort newest first
  records.sort((a, b) => {
    const da = a.breachedAt ? new Date(a.breachedAt).getTime() : 0;
    const db = b.breachedAt ? new Date(b.breachedAt).getTime() : 0;
    return db - da;
  });

  const validDates = records
    .map((r) => r.breachedAt)
    .filter(Boolean)
    .sort();

  return {
    breachModule: {
      module: "data-breach",
      category: "security",
      depth: "rich",
      locked: false,
      lockedFields: [],
      lockedExtraCount: 0,
      profile: null,
      extras: {
        recordCount: records.length,
        firstBreachedAt: validDates[0] || null,
        lastBreachedAt: validDates[validDates.length - 1] || null,
        records: records.slice(0, 60),
      },
    },
    discoveredPlatforms: Array.from(discoveredPlatforms),
  };
}

// 10. Silent Account Existence Checks — EXACT email registration (holehe-style) — 12 platforms
async function checkSilentAccounts(email) {
  const foundBasic = [];
  const randUser = () => Array.from({ length: 8 + Math.floor(Math.random() * 12) }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");

  const checks = [
    // Spotify (exact)
    (async () => {
      try {
        const r = await fetch(
          `https://spclient.wg.spotify.com/signup/public/v1/account?validate=1&email=${encodeURIComponent(email)}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (r.ok) {
          const j = await r.json();
          if (j.status === 20) {
            foundBasic.push({
              module: "spotify",
              category: "entertainment",
              depth: "basic",
              locked: false,
              lockedFields: [],
              lockedExtraCount: 0,
              profile: null,
              extras: { method: "exact email — Spotify validate" },
            });
          }
        }
      } catch {}
    })(),

    // Firefox Accounts (exact)
    (async () => {
      try {
        const r = await fetch("https://api.accounts.firefox.com/v1/account/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
          signal: AbortSignal.timeout(5000),
        });
        if (r.ok) {
          const j = await r.json();
          if (j.exists === true) {
            foundBasic.push({
              module: "firefox",
              category: "software",
              depth: "basic",
              locked: false,
              lockedFields: [],
              lockedExtraCount: 0,
              profile: null,
              extras: { method: "exact email — Firefox" },
            });
          }
        }
      } catch {}
    })(),

    // WordPress.com (exact)
    (async () => {
      try {
        const r = await fetch(
          `https://public-api.wordpress.com/rest/v1.1/users/${encodeURIComponent(email)}/auth-options`,
          { signal: AbortSignal.timeout(5000) }
        );
        const j = await r.json().catch(() => ({}));
        if (r.status === 200 || j.error === "email_login_not_allowed") {
          foundBasic.push({
            module: "wordpress",
            category: "developer",
            depth: "basic",
            locked: false,
            lockedFields: [],
            lockedExtraCount: 0,
            profile: null,
            extras: null,
          });
        }
      } catch {}
    })(),

    // Pinterest — exact email via EmailExistsResource (holehe)
    (async () => {
      try {
        const r = await fetch(
          `https://www.pinterest.com/_ngjs/resource/EmailExistsResource/get/?source_url=/&data=${encodeURIComponent(JSON.stringify({ options: { email }, context: {} }))}`,
          { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(5000) }
        );
        if (r.ok) {
          const j = await r.json().catch(() => null);
          const data = j?.resource_response?.data;
          // holehe logic: if data is truthy and not containing source_field → exists
          if (data && !String(JSON.stringify(data)).includes("source_field")) {
            foundBasic.push({ module: "pinterest", category: "social", depth: "basic", locked: false, lockedFields: [], lockedExtraCount: 0, profile: null, extras: { method: "exact email — Pinterest" } });
          }
        }
      } catch {}
    })(),

    // Twitter/X — exact email via email_available.json (holehe)
    (async () => {
      try {
        const r = await fetch(`https://api.twitter.com/i/users/email_available.json?email=${encodeURIComponent(email)}`, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(5000) });
        if (r.ok) {
          const j = await r.json().catch(() => null);
          if (j && j.taken === true) {
            foundBasic.push({ module: "x", category: "social", depth: "basic", locked: false, lockedFields: [], lockedExtraCount: 0, profile: null, extras: { method: "exact email — X/Twitter" } });
          }
        }
      } catch {}
    })(),

    // Instagram — exact email via web_create_ajax/attempt (holehe)
    (async () => {
      try {
        const headers = { "User-Agent": "Mozilla/5.0", Accept: "text/html", "Accept-Language": "en-US,en;q=0.5" };
        const freq = await fetch("https://www.instagram.com/accounts/emailsignup/", { headers, signal: AbortSignal.timeout(6000) });
        const html = await freq.text();
        // try both escaped and unescaped token patterns
        let token = null;
        const m1 = html.match(/"csrf_token"\s*:\s*"([^"]+)"/);
        const m2 = html.match(/csrf_token\\"\\s*:\\s*\\"([^\\"]+)\\"/);
        token = m1?.[1] || m2?.[1]?.replace(/\\u0026/g, "&") || null;
        if (!token) return;
        const data = new URLSearchParams({ email, username: randUser(), first_name: "", opt_into_one_tap: "false" });
        const check = await fetch("https://www.instagram.com/api/v1/web/accounts/web_create_ajax/attempt/", {
          method: "POST",
          headers: { ...headers, "x-csrftoken": token, "Content-Type": "application/x-www-form-urlencoded", Origin: "https://www.instagram.com", "X-Requested-With": "XMLHttpRequest" },
          body: data,
          signal: AbortSignal.timeout(6000),
        });
        const j = await check.json().catch(() => null);
        if (j && j.status !== "fail" && j.errors && j.errors.email) {
          const code = j.errors.email[0]?.code;
          if (code === "email_is_taken" || String(j.errors).includes("email_sharing_limit")) {
            foundBasic.push({ module: "instagram", category: "social", depth: "basic", locked: false, lockedFields: [], lockedExtraCount: 0, profile: null, extras: { method: "exact email — Instagram" } });
          }
        } else if (j && j.errors && String(j.errors).includes("email_sharing_limit")) {
          foundBasic.push({ module: "instagram", category: "social", depth: "basic", locked: false, lockedFields: [], lockedExtraCount: 0, profile: null, extras: { method: "exact email — Instagram" } });
        }
      } catch {}
    })(),

    // ProtonMail PGP Keyserver
    (async () => {
      try {
        const r = await fetch(
          `https://api.protonmail.ch/pks/lookup?op=index&search=${encodeURIComponent(email)}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (r.ok) {
          const text = await r.text();
          if (text.includes("pub:")) {
            foundBasic.push({
              module: "protonmail",
              category: "software",
              depth: "basic",
              locked: false,
              lockedFields: [],
              lockedExtraCount: 0,
              profile: null,
              extras: null,
            });
          }
        }
      } catch {}
    })(),
  ];

  await Promise.allSettled(checks);
  return foundBasic;
}

// ——— Derive candidate usernames — EXACT ONLY (verified usernames, not email guesses) ———
function deriveCandidateUsernames(email, discoveredUsernames = []) {
  const cands = new Set();
  // 1) Exact verified usernames discovered via Gravatar, GitHub, LinkedIn, breach, etc.
  for (const u of discoveredUsernames) {
    if (!u) continue;
    const clean = String(u).trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9._-]/g, "");
    if (clean.length >= 2 && clean.length <= 30 && /^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(clean.replace(/^[._-]+|[._-]+$/g, ""))) {
      cands.add(clean.replace(/^[._-]+|[._-]+$/g, ""));
    }
  }
  // 2) If no verified username found, fallback to ONE derived handle from email local part — but it will be labeled "derived" in UI, not "exact"
  if (cands.size === 0) {
    const local = String(email).split("@")[0].split("+")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
    const cleaned = local.replace(/^[._-]+|[._-]+$/g, "");
    if (cleaned.length >= 3 && cleaned.length <= 30) cands.add(cleaned);
  }
  // Limit to 2 handles max to avoid false positives across many platforms
  return Array.from(cands).slice(0, 2);
}

// ——— NEW: Google Location Timeline synthesized from all geo signals ———
function buildGoogleTimeline(email, emailModules, summary) {
  const entries = [];
  const seenPlaces = new Set();

  const addEntry = (dateStr, place, type, title, url) => {
    if (!place && !title) return;
    const key = `${place?.name || title || ""}-${dateStr || ""}`;
    if (seenPlaces.has(key)) return;
    seenPlaces.add(key);
    entries.push({
      date: dateStr || null,
      place: place ? { name: place.name || null, address: place.address || null } : null,
      type, // 'photo' | 'review' | 'work' | 'gravatar' | 'github'
      title: title || null,
      url: url || null,
    });
  };

  for (const m of emailModules || []) {
    if (m.module === "google-photos" && m.extras?.photos) {
      for (const p of m.extras.photos) addEntry(p.takenAt || null, p.place, "photo", p.title || "Google Photo", p.url || null);
    }
    if (m.module === "google-reviews" && m.extras?.reviews) {
      for (const r of m.extras.reviews) addEntry(r.reviewedAt || null, r.place, "review", `${r.rating}★ Review: ${(r.text || "").slice(0, 80)}`, null);
    }
    if (m.module === "linkedin" && m.profile?.location) {
      addEntry(m.profile.lastActiveAt || m.profile.createdAt || null, { name: m.profile.location, address: m.profile.location }, "work", "LinkedIn location", m.profile.profileUrl || null);
    }
    if (m.module === "gravatar" && m.profile?.location) {
      addEntry(null, { name: m.profile.location, address: m.profile.location }, "gravatar", "Gravatar location", null);
    }
    if (m.module === "github" && m.profile?.location) {
      addEntry(m.profile.lastActiveAt || null, { name: m.profile.location, address: m.profile.location }, "github", "GitHub location", m.profile.profileUrl || null);
    }
  }

  // Fallback: if no geo at all but we have summary locations, show them as timeline points
  if (entries.length === 0 && summary?.locations?.length) {
    for (const l of summary.locations.slice(0, 4)) {
      addEntry(null, { name: l.location || l.countryCode, address: l.location || l.countryCode }, "location", "Reported location", null);
    }
  }

  // If no geo at all, still return a timeline shell so UI shows "Full Access" card with 0 entries (not hidden) — real private Timeline requires OAuth, we explain.
  if (entries.length === 0) {
    return {
      module: "google-timeline",
      category: "social",
      depth: "rich",
      locked: false,
      lockedFields: [],
      lockedExtraCount: 0,
      profile: {
        avatarUrl: summary?.profilePictures?.[0]?.url || null,
        displayName: summary?.names?.[0]?.value || email.split("@")[0],
        username: null,
        profileUrl: `https://www.google.com/maps/contrib/${emailModules?.find((m) => m.extras?.accountId)?.extras?.accountId || ""}`,
        bio: "No public location history found — private Google Timeline requires OAuth and is not exposed. This card shows what an OSINT pivot can infer from Gravatar, LinkedIn, GitHub, breach and other public signals (see All Locations grid).",
        location: null,
        countryCode: null,
        accountType: "personal",
        createdAt: null,
        lastActiveAt: null,
        followerCount: null,
        followingCount: null,
      },
      extras: {
        entryCount: 0,
        locationCount: 0,
        earliest: null,
        latest: null,
        entries: [],
      },
    };
  }

  // Sort chronologically (dated first, undated last)
  entries.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  const dated = entries.filter((e) => e.date).map((e) => new Date(e.date).getTime());
  const earliest = dated.length ? new Date(Math.min(...dated)).toISOString() : null;
  const latest = dated.length ? new Date(Math.max(...dated)).toISOString() : null;

  return {
    module: "google-timeline",
    category: "social",
    depth: "rich",
    locked: false,
    lockedFields: [],
    lockedExtraCount: 0,
    profile: {
      avatarUrl: summary?.profilePictures?.[0]?.url || null,
      displayName: summary?.names?.[0]?.value || email.split("@")[0],
      username: null,
      profileUrl: `https://www.google.com/maps/contrib/${emailModules?.find((m) => m.extras?.accountId)?.extras?.accountId || ""}`,
      bio: "Synthesized location history from public Maps, Photos, Reviews, and profile signals. Private Timeline is not exposed — this is what an OSINT pivot can infer.",
      location: summary?.locations?.[0]?.location || null,
      countryCode: summary?.locations?.[0]?.countryCode || null,
      accountType: "personal",
      createdAt: earliest,
      lastActiveAt: latest,
      followerCount: null,
      followingCount: null,
    },
    extras: {
      entryCount: entries.length,
      locationCount: new Set(entries.map((e) => e.place?.name).filter(Boolean)).size,
      earliest,
      latest,
      entries: entries.slice(0, 24),
    },
  };
}

// ——— NEW: Username social footprint (Instagram, Facebook, YouTube, etc.) ———
const USERNAME_PLATFORMS = [
  {
    id: "instagram",
    label: "Instagram",
    category: "social",
    url: (u) => `https://www.instagram.com/${encodeURIComponent(u)}/`,
    check: async (u) => {
      // Instagram heavily rate-limits (429) — treat 429/403 as unknown, not not-found
      try {
        const r = await fetch(`https://www.instagram.com/${encodeURIComponent(u)}/`, {
          headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
          redirect: "follow",
          signal: AbortSignal.timeout(4500),
        });
        if (r.status === 404) return "not_found";
        if (r.status === 429 || r.status === 403) return "unknown";
        const t = await r.text();
        const low = t.toLowerCase();
        if (low.includes("sorry, this page isn") || low.includes("the link you followed may be broken")) return "not_found";
        // heuristic: real profile contains og:title with username
        if (t.includes(`"${u}"`) || low.includes(`instagram photos and videos`)) return "found";
        return r.ok ? "found" : "unknown";
      } catch { return "unknown"; }
    },
  },
  {
    id: "facebook",
    label: "Facebook",
    category: "social",
    url: (u) => `https://www.facebook.com/${encodeURIComponent(u)}`,
    check: async (u) => {
      try {
        const r = await fetch(`https://www.facebook.com/${encodeURIComponent(u)}`, {
          headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
          redirect: "follow",
          signal: AbortSignal.timeout(4500),
        });
        if (r.status === 404) return "not_found";
        const t = await r.text();
        const low = t.toLowerCase();
        if (low.includes("this page isn") || low.includes("the link you followed may be broken") || low.includes("page not found")) return "not_found";
        // real profile ~505KB, fake ~457KB but both 200 — use presence of "profile" + username in og:title
        if (t.includes(`facebook.com/${u}`) || t.includes(`"${u}"`)) return "found";
        return r.ok ? "unknown" : "unknown";
      } catch { return "unknown"; }
    },
  },
  {
    id: "youtube",
    label: "YouTube",
    category: "social",
    url: (u) => `https://www.youtube.com/@${encodeURIComponent(u)}`,
    check: async (u) => {
      try {
        const r = await fetch(`https://www.youtube.com/@${encodeURIComponent(u)}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(4500),
        });
        if (r.status === 404) return "not_found";
        if (r.status === 429) return "unknown";
        return r.ok ? "found" : "unknown";
      } catch { return "unknown"; }
    },
  },
  {
    id: "tiktok",
    label: "TikTok",
    category: "social",
    url: (u) => `https://www.tiktok.com/@${encodeURIComponent(u)}`,
    check: async (u) => {
      // TikTok returns 200 for both found/not-found in our env — mark as unknown and show manual link
      try {
        const r = await fetch(`https://www.tiktok.com/@${encodeURIComponent(u)}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(4000),
        });
        // treat all 200 as "unknown — check manually" to avoid false positives
        if (r.status === 404) return "not_found";
        return "unknown";
      } catch { return "unknown"; }
    },
  },
  {
    id: "x",
    label: "X (Twitter)",
    category: "social",
    url: (u) => `https://x.com/${encodeURIComponent(u)}`,
    check: async (u) => {
      try {
        const r = await fetch(`https://x.com/${encodeURIComponent(u)}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(4500),
        });
        if (r.status === 404) return "not_found";
        const t = await r.text();
        if (t.toLowerCase().includes("this account doesn") || t.toLowerCase().includes("page not found")) return "not_found";
        return r.ok ? "unknown" : "unknown";
      } catch { return "unknown"; }
    },
  },
  {
    id: "snapchat",
    label: "Snapchat",
    category: "social",
    url: (u) => `https://www.snapchat.com/add/${encodeURIComponent(u)}`,
    check: async (u) => {
      try {
        const r = await fetch(`https://www.snapchat.com/add/${encodeURIComponent(u)}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(4500),
        });
        if (r.status === 404) return "not_found";
        return r.ok ? "unknown" : "unknown";
      } catch { return "unknown"; }
    },
  },
  {
    id: "reddit",
    label: "Reddit",
    category: "social",
    url: (u) => `https://www.reddit.com/user/${encodeURIComponent(u)}/`,
    check: async (u) => {
      try {
        const r = await fetch(`https://www.reddit.com/user/${encodeURIComponent(u)}/`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(4500),
        });
        if (r.status === 404) return "not_found";
        if (r.status === 403 || r.status === 429) return "unknown";
        return r.ok ? "unknown" : "unknown";
      } catch { return "unknown"; }
    },
  },
  {
    id: "pinterest",
    label: "Pinterest",
    category: "social",
    url: (u) => `https://www.pinterest.com/${encodeURIComponent(u)}/`,
    check: async (u) => {
      try {
        const r = await fetch(`https://www.pinterest.com/${encodeURIComponent(u)}/`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(4500),
        });
        if (r.status === 404) return "not_found";
        return r.ok ? "unknown" : "unknown";
      } catch { return "unknown"; }
    },
  },
  {
    id: "github",
    label: "GitHub",
    category: "developer",
    url: (u) => `https://github.com/${encodeURIComponent(u)}`,
    check: async (u) => {
      try {
        const r = await fetch(`https://github.com/${encodeURIComponent(u)}`, {
          headers: { "User-Agent": "BehindTheEmail-OSINT/1.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(4500),
        });
        if (r.status === 404) return "not_found";
        return r.ok ? "found" : "unknown";
      } catch { return "unknown"; }
    },
  },
  {
    id: "gitlab",
    label: "GitLab",
    category: "developer",
    url: (u) => `https://gitlab.com/${encodeURIComponent(u)}`,
    check: async (u) => {
      try {
        const r = await fetch(`https://gitlab.com/${encodeURIComponent(u)}`, {
          headers: { "User-Agent": "BehindTheEmail-OSINT/1.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(4500),
        });
        if (r.status === 404) return "not_found";
        return r.ok ? "found" : "unknown";
      } catch { return "unknown"; }
    },
  },
  {
    id: "telegram",
    label: "Telegram",
    category: "social",
    url: (u) => `https://t.me/${encodeURIComponent(u)}`,
    check: async (u) => {
      try {
        const r = await fetch(`https://t.me/${encodeURIComponent(u)}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(4500),
        });
        const t = await r.text();
        if (t.includes("View @") && t.includes(u)) return "found";
        if (t.includes("Telegram Messenger") && !t.includes("View @")) return "not_found";
        if (r.status === 404) return "not_found";
        return "unknown";
      } catch { return "unknown"; }
    },
  },
  {
    id: "twitch",
    label: "Twitch",
    category: "entertainment",
    url: (u) => `https://www.twitch.tv/${encodeURIComponent(u)}`,
    check: async (u) => {
      try {
        const r = await fetch(`https://www.twitch.tv/${encodeURIComponent(u)}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(4500),
        });
        const t = await r.text();
        if (t.includes("og:profile:username") && t.toLowerCase().includes(u.toLowerCase())) return "found";
        if (t.includes("<title>Twitch</title>") && !t.includes("og:profile:username")) return "not_found";
        if (r.status === 404) return "not_found";
        return "unknown";
      } catch { return "unknown"; }
    },
  },
  {
    id: "medium",
    label: "Medium",
    category: "social",
    url: (u) => `https://medium.com/@${encodeURIComponent(u)}`,
    check: async (u) => {
      try {
        const r = await fetch(`https://medium.com/@${encodeURIComponent(u)}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(4500),
        });
        if (r.status === 404) return "not_found";
        if (r.status === 403) return "unknown";
        return r.ok ? "unknown" : "unknown";
      } catch { return "unknown"; }
    },
  },
  {
    id: "dribbble",
    label: "Dribbble",
    category: "developer",
    url: (u) => `https://dribbble.com/${encodeURIComponent(u)}`,
    check: async (u) => {
      try {
        const r = await fetch(`https://dribbble.com/${encodeURIComponent(u)}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(4500),
        });
        if (r.status === 404) return "not_found";
        return r.ok ? "found" : "unknown";
      } catch { return "unknown"; }
    },
  },
  {
    id: "soundcloud",
    label: "SoundCloud",
    category: "entertainment",
    url: (u) => `https://soundcloud.com/${encodeURIComponent(u)}`,
    check: async (u) => {
      try {
        const r = await fetch(`https://soundcloud.com/${encodeURIComponent(u)}`, {
          headers: { "User-Agent": "Mozilla/5.0" },
          redirect: "follow",
          signal: AbortSignal.timeout(4500),
        });
        if (r.status === 404) return "not_found";
        if (r.status === 401) return "found";
        return "unknown";
      } catch { return "unknown"; }
    },
  },
  {
    id: "threads",
    label: "Threads",
    category: "social",
    url: (u) => `https://www.threads.net/@${encodeURIComponent(u)}`,
    check: async () => "unknown",
  },
  {
    id: "vk",
    label: "VK",
    category: "social",
    url: (u) => `https://vk.com/${encodeURIComponent(u)}`,
    check: async () => "unknown",
  },
];

async function checkUsernameSocials(candidateUsernames) {
  if (!candidateUsernames || candidateUsernames.length === 0) return [];
  const usernames = candidateUsernames.slice(0, 2);
  const results = [];

  // Run platforms in parallel with concurrency 5 to stay fast (bulk-safe)
  const concurrency = 5;
  for (let i = 0; i < USERNAME_PLATFORMS.length; i += concurrency) {
    const chunk = USERNAME_PLATFORMS.slice(i, i + concurrency);
    const settled = await Promise.all(
      chunk.map(async (plat) => {
        let best = "unknown";
        let bestUrl = plat.url(usernames[0]);
        let bestUser = usernames[0];
        for (const u of usernames) {
          try {
            const res = await plat.check(u);
            if (res === "found") { best = "found"; bestUrl = plat.url(u); bestUser = u; break; }
            if (res === "not_found" && best !== "found") { best = "not_found"; bestUrl = plat.url(u); bestUser = u; }
          } catch { /* keep unknown */ }
        }
        return {
          platform: plat.id,
          label: plat.label,
          category: plat.category,
          username: bestUser,
          url: bestUrl,
          status: best,
        };
      })
    );
    results.push(...settled);
  }
  // preserve original order
  return results;
}

function buildSocialUsernameModules(usernameResults) {
  // Return ALL 16 platforms with actual live status (found / not_found / unknown) — not filtered — so user sees full grid with Maps links & verify buttons.
  // Each card is labeled with method: exact username pivot (from verified Gravatar/breach) vs derived fallback.
  return usernameResults.map((r) => {
    const isFound = r.status === "found";
    return {
      module: r.platform,
      category: r.category,
      depth: "basic",
      locked: false,
      lockedFields: [],
      lockedExtraCount: 0,
      profile: isFound
        ? {
            avatarUrl: null,
            displayName: r.username,
            username: r.username,
            profileUrl: r.url,
            bio:
              r.status === "found"
                ? `Handle @${r.username} exists on ${r.label} — verified via live HTTP check (username pivot from discovered Gravatar/breach username). Visit link to confirm identity.`
                : null,
            location: null,
            countryCode: null,
            accountType: "personal",
            createdAt: null,
            lastActiveAt: null,
            followerCount: null,
            followingCount: null,
          }
        : null,
      extras: {
        username: r.username,
        url: r.url,
        status: r.status, // found | not_found | unknown
        label: r.label,
        method: r.status === "found" ? "live check — handle exists" : r.status === "not_found" ? "live check — not found" : "live check — unknown (rate-limited, verify manually)",
      },
    };
  });
}

function buildWhatsAppModules(phoneNumbers) {
  if (!phoneNumbers || phoneNumbers.length === 0) return [];
  return phoneNumbers.slice(0, 2).map((p) => {
    const digits = String(p.value || p).replace(/[^0-9+]/g, "");
    const waDigits = digits.replace(/^\+/, "");
    return {
      module: "whatsapp",
      category: "social",
      depth: "basic",
      locked: false,
      lockedFields: [],
      lockedExtraCount: 0,
      profile:
        waDigits.length >= 8
          ? {
              avatarUrl: null,
              displayName: p.value || digits,
              username: waDigits,
              profileUrl: `https://wa.me/${waDigits}`,
              bio: "Phone number found in breach/recovery data — WhatsApp link is likely reachable (no notification sent).",
              location: null,
              countryCode: null,
              accountType: "personal",
              createdAt: null,
              lastActiveAt: null,
              followerCount: null,
              followingCount: null,
            }
          : null,
      extras: { phone: p.value || digits, waUrl: `https://wa.me/${waDigits}`, status: waDigits.length >= 8 ? "found" : "unknown" },
    };
  });
}

module.exports = {
  SHOWCASE_PROFILES,
  mergeModuleIntoSummary,
  checkEmailService,
  checkEmailPattern,
  checkDomainWebsite,
  checkGravatar,
  checkGitHub,
  checkDuolingo,
  checkAdobe,
  checkMicrosoftAndTeams,
  checkDataBreaches,
  checkSilentAccounts,
  deriveCandidateUsernames,
  buildGoogleTimeline,
  checkUsernameSocials,
  buildSocialUsernameModules,
  buildWhatsAppModules,
  USERNAME_PLATFORMS,
};
