document.addEventListener('DOMContentLoaded', function() {
  
  const triggerButton = document.getElementById('hypothesis-trigger');

  // 检查按钮是否存在
  if (triggerButton) {
    
    // 监听点击事件
    triggerButton.addEventListener('click', function(event) {
      event.preventDefault(); // 阻止 <a> 标签的默认跳转行为

      // 防止重复加载：检查脚本是否已被加载
      if (document.querySelector('script[src="https://hypothes.is/embed.js"]')) {
        console.log('Hypothes.is is already loaded or loading.');
        return;
      }
      
      console.log('Loading Hypothes.is script...');

      // 1. 创建一个新的 <script> 标签
      const hypothesisScript = document.createElement('script');
      hypothesisScript.src = 'https://hypothes.is/embed.js';
      hypothesisScript.async = true; // 异步加载

      // 2. 将脚本添加到 <head> 中
      document.head.appendChild(hypothesisScript);

      // 3. 隐藏触发按钮，因为脚本加载后Hypothes.is会显示自己的UI
      this.style.display = 'none';
    });
  }
});