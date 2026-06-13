import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';

describe('AppModule bootstrap', () => {
  it('resolves all NestJS dependencies', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    expect(moduleRef).toBeDefined();
    await moduleRef.close();
  });
});
