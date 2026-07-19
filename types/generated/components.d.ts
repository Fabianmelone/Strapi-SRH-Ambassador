import type { Schema, Struct } from '@strapi/strapi';

export interface MaterialMaterial extends Struct.ComponentSchema {
  collectionName: 'components_material_materials';
  info: {
    displayName: 'Duration';
    icon: 'clock';
  };
  attributes: {
    End: Schema.Attribute.DateTime;
    Start: Schema.Attribute.DateTime;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'material.material': MaterialMaterial;
    }
  }
}
