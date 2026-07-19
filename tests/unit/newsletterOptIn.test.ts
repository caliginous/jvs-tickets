import {
  EVENTS_OPT_IN_FIELD,
  NEWSLETTER_OPT_IN_FIELD,
  parseEmailOptIns,
  serializeOrderCustomFields,
} from '../../src/lib/newsletterOptIn';

describe('newsletter opt-in order metadata', () => {
  it('stores both choices alongside event custom fields', () => {
    const serialized = serializeOrderCustomFields(
      { dietaryRequirements: 'Vegan' },
      { subscribeNewsletter: true, subscribeEvents: false },
    );

    expect(JSON.parse(serialized!)).toEqual({
      dietaryRequirements: 'Vegan',
      [NEWSLETTER_OPT_IN_FIELD]: 'true',
      [EVENTS_OPT_IN_FIELD]: 'false',
    });
  });

  it('defaults both options to false', () => {
    expect(parseEmailOptIns(serializeOrderCustomFields({}, {}))).toEqual({
      subscribeNewsletter: false,
      subscribeEvents: false,
    });
  });

  it('returns safe defaults for missing or malformed metadata', () => {
    expect(parseEmailOptIns(null)).toEqual({
      subscribeNewsletter: false,
      subscribeEvents: false,
    });
    expect(parseEmailOptIns('not-json')).toEqual({
      subscribeNewsletter: false,
      subscribeEvents: false,
    });
  });
});
