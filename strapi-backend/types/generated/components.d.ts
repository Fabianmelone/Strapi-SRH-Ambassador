import type { Schema, Struct } from '@strapi/strapi';

export interface SharedDuration extends Struct.ComponentSchema {
  collectionName: 'components_shared_durations';
  info: {
    displayName: 'Duration';
    icon: 'clock';
  };
  attributes: {
    end_datetime: Schema.Attribute.DateTime;
    start_datetime: Schema.Attribute.DateTime;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.duration': SharedDuration;
    }
  }
}
