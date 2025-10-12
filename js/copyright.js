jQuery(function($) {
  // ▼ 你原来的代码从这里开始，原封不动 ▼
  !function (e, t, a) {
      var script = document.currentScript || (function () {
          var scripts = document.getElementsByTagName("script");
          return scripts[scripts.length - 1]
      })()
      var successText = $(script).attr("successtext")
      var clipboard = new ClipboardJS('.fa-clipboard');
      clipboard.on('success', function () {
          if (successText) {
              toastr.options = {
                  "positionClass": "toast-top-center",
                  "timeOut": "1000",
              }
              toastr.success(successText)
          }
      });
  }(window, document);
  // ▲ 你原来的代码到这里结束 ▲
});