var searchFunc = function(path, search_id, content_id) {
    'use strict';
    
    // 辅助函数：防抖动，避免频繁触发
    function debounce(func, wait) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }

    // 辅助函数：转义正则特殊字符，防止搜 "(", "." 等导致报错
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
    }

    $.ajax({
        url: path,
        dataType: "xml",
        success: function(xmlResponse) {
            // [优化1] 数据预处理：AJAX加载完后立刻处理，只做一次
            // 将所有文章内容转为纯文本，避免在搜索循环中反复操作
            var datas = $("entry", xmlResponse).map(function() {
                return {
                    title: $("title", this).text(),
                    content: $("content", this).text().trim().replace(/<[^>]+>/g, ""),
                    url: $("url", this).text()
                };
            }).get();

            var $input = document.getElementById(search_id);
            var $resultContent = document.getElementById(content_id);
            
            if (!$input || !$resultContent) return;

            // 核心搜索逻辑
            var performSearch = function() {
                var str = '<ul class=\"search-result-list\">';
                var keywords = $input.value.trim().toLowerCase().split(/[\s\-]+/);
                $resultContent.innerHTML = "";
                
                if ($input.value.trim().length <= 0) {
                    return;
                }

                // [防线2] 结果计数器，防止结果过多
                var matchCount = 0;
                var MAX_DISPLAY = 50; 

                // 遍历文章
                datas.forEach(function(data) {
                    if (matchCount >= MAX_DISPLAY) return; // 超过限制不再渲染

                    var isMatch = true;
                    var data_title = data.title.trim().toLowerCase();
                    var data_content = data.content.trim().toLowerCase();
                    var data_url = data.url;
                    var index_title = -1;
                    var index_content = -1;
                    
                    // 仅当 content 不为空时才搜
                    if (data_content !== '') {
                        // 1. 检查所有关键词是否都存在
                        keywords.forEach(function(keyword) {
                            index_title = data_title.indexOf(keyword);
                            index_content = data_content.indexOf(keyword);
                            if (index_title < 0 && index_content < 0) {
                                isMatch = false;
                            }
                        });
                    } else {
                        isMatch = false;
                    }

                    if (isMatch) {
                        matchCount++;
                        str += "<li><a href='" + data_url + "' class='search-result-title'>" + data.title + "</a>";
                        
                        // [优化2] 查找并合并所有关键词片段
                        var ranges = [];
                        
                        keywords.forEach(function(keyword) {
                            // 使用转义后的关键词构建正则
                            var regEx = new RegExp(escapeRegExp(keyword), "gi");
                            var match;
                            // 查找所有出现位置
                            while ((match = regEx.exec(data.content)) !== null) {
                                ranges.push({
                                    start: Math.max(0, match.index - 20),
                                    end: Math.min(data.content.length, match.index + 80)
                                });
                            }
                        });

                        // 按起始位置排序
                        ranges.sort(function(a, b) { return a.start - b.start; });

                        // 合并重叠区域
                        var mergedRanges = [];
                        if (ranges.length > 0) {
                            var current = ranges[0];
                            for (var i = 1; i < ranges.length; i++) {
                                if (ranges[i].start <= current.end) {
                                    current.end = Math.max(current.end, ranges[i].end);
                                } else {
                                    mergedRanges.push(current);
                                    current = ranges[i];
                                }
                            }
                            mergedRanges.push(current);
                        }

                        // 构建摘要内容
                        var match_content = "";
                        // [防线3] 每篇文章最多显示3个片段
                        var MAX_SNIPPETS = 3; 
                        
                        if (mergedRanges.length > 0) {
                            var loopCount = Math.min(mergedRanges.length, MAX_SNIPPETS);
                            for (var j = 0; j < loopCount; j++) {
                                match_content += data.content.substring(mergedRanges[j].start, mergedRanges[j].end) + " ... ";
                            }
                        } else {
                            // 关键词只在标题里，正文没找到，显示开头
                            match_content = data.content.substring(0, 100) + "...";
                        }

                        // 高亮关键词
                        keywords.forEach(function(keyword) {
                            var regS = new RegExp(escapeRegExp(keyword), "gi");
                            match_content = match_content.replace(regS, "<em class=\"search-keyword\">" + keyword + "</em>");
                        });

                        str += "<p class=\"search-result\">" + match_content + "</p>";
                        str += "</li>";
                    }
                });
                str += "</ul>";
                $resultContent.innerHTML = str;
            };

            // [防线1] 绑定输入事件，使用 300ms 防抖
            $input.addEventListener('input', debounce(function() {
                performSearch();
            }, 300));
        }
    });
}