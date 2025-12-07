// Global school configuration for YAT?STATS microsites
// TODO: wire CURRENT_HSID to subdomain (hsid.yatstats.com)

const CURRENT_HSID = '5004';

const SCHOOL_CONFIGS = {
  '5004': {
    hsid: '5004',
    name: 'Hamilton High School',
    city_state: 'CHANDLER, AZ',
    tagline: 'ACTIVE BASEBALL ALUMNI',
    crestAlt: 'Hamilton Huskies Logo',
  },
};

function buildSchoolConfig(hsid) {
  const entry = SCHOOL_CONFIGS[hsid] || {};
  const derived = {
    crest: `assets/img/schools/${hsid}.png`,
    crestAlt: entry.crestAlt || 'School crest',
  };
  return {
    hsid,
    name: entry.name || 'Your High School',
    city_state: entry.city_state || 'CITY, STATE',
    tagline: entry.tagline || 'ACTIVE BASEBALL ALUMNI',
    ...derived,
  };
}

window.SCHOOL_CONFIG = buildSchoolConfig(CURRENT_HSID);
