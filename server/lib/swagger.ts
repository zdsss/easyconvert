import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EasyConvert API',
      version: '2.0.0',
      description: '简历解析系统 API',
    },
    servers: [{ url: '/api/v1', description: 'API v1' }],
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
    },
  },
  apis: ['./server/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
