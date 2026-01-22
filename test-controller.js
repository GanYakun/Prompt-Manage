const AppController = require('./src/controllers/AppController.js');

(async () => {
  try {
    console.log('Testing AppController initialization...');
    const controller = new AppController();
    await controller.initialize();
    console.log('AppController initialized successfully');
    
    const prompts = await controller.getAllPrompts();
    console.log('Prompts loaded:', prompts.length);
    
    if (prompts.length > 0) {
      console.log('First prompt:', prompts[0].title);
    }
    
    console.log('AppController test completed successfully');
  } catch (error) {
    console.error('AppController test failed:', error);
  }
})();