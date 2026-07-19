import type { Schema, Struct } from '@strapi/strapi';

export interface MaterialMaterial extends Struct.ComponentSchema {
  collectionName: 'components_material_materials';
  info: {
    displayName: 'material';
  };
  attributes: {};
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'material.material': MaterialMaterial;
    }
  }
}
