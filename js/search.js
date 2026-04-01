var searchFunc = function(path, search_id, content_id) {
    'use strict';
    $.ajax({
        url: path,
        dataType: "xml",
        success: function( xmlResponse ) {
            // 获取搜索数据
            var datas = $( "entry", xmlResponse ).map(function() {
                return {
                    title: $( "title", this ).text(),
                    content: $("content",this).text(),
                    url: $( "url" , this).text()
                };
            }).get();

            var $input = document.getElementById(search_id);
            if (!$input) return;
            var $resultContent = document.getElementById(content_id);
            if ($("#local-search-input").length > 0) {
                $input.addEventListener('input', function () {
                    var str = '<ul class=\"search-result-list\">';
                    var keywords = this.value.trim().toLowerCase().split(/[\s\-]+/);
                    $resultContent.innerHTML = "";
                    if (this.value.trim().length <= 0) {
                        return;
                    }
                    // 执行本地搜索
                    datas.forEach(function (data) {
                        var isMatch = true;
                        if (!data.title || data.title.trim() === '') {
                            data.title = "Untitled";
                        }
                        var data_title = data.title.trim().toLowerCase();
                        var data_content_raw = data.content.trim(); 
                        var data_content_lower = data_content_raw.replace(/<[^>]+>/g, "").toLowerCase();
                        var data_url = data.url;
                        var index_title = -1;
                        var index_content = -1;
                        var first_occur = -1;
                        
                        if (data_content_lower !== '') {
                            keywords.forEach(function (keyword, i) {
                                index_title = data_title.indexOf(keyword);
                                index_content = data_content_lower.indexOf(keyword);

                                if (index_title < 0 && index_content < 0) {
                                    isMatch = false;
                                } else {
                                    if (index_content < 0) {
                                        index_content = 0;
                                    }
                                    if (i === 0) {
                                        first_occur = index_content;
                                    }
                                }
                            });
                        } else {
                            isMatch = false;
                        }
                        
                        // 显示搜索结果
                        if (isMatch) {
                            str += "<li><a href='" + data_url + "' class='search-result-title'>" + data.title + "</a>";
                            
                            // === 核心修改部分：提取完整段落 ===
                            if (first_occur >= 0) {
                                // 1. 将常见的区块标签转换为换行符，防止段落粘连
                                var formattedContent = data_content_raw.replace(/<\/p>|<br\s*\/?>|<\/div>|<\/li>|<\/h[1-6]>/gi, "\n");
                                // 2. 去除剩余的HTML标签
                                var plainContent = formattedContent.replace(/<[^>]+>/g, "").trim();
                                // 3. 按照换行符拆分成段落数组
                                var paragraphs = plainContent.split(/\n+/);
                                
                                var match_content = "";
                                
                                // 4. 遍历段落，找到第一个包含任意关键词的段落
                                for (var p = 0; p < paragraphs.length; p++) {
                                    var para = paragraphs[p];
                                    var paraLower = para.toLowerCase();
                                    var hasKeyword = false;
                                    
                                    for (var k = 0; k < keywords.length; k++) {
                                        if (paraLower.indexOf(keywords[k]) >= 0) {
                                            hasKeyword = true;
                                            break;
                                        }
                                    }
                                    
                                    if (hasKeyword) {
                                        match_content = para;
                                        break; // 找到匹配段落后跳出循环，只展示该段落
                                    }
                                }
                                
                                // 如果没在正文段落中找到（比如只匹配了标题），默认展示第一段
                                if (match_content === "" && paragraphs.length > 0) {
                                    match_content = paragraphs[0];
                                }

                                // 5. 高亮所有关键词
                                keywords.forEach(function (keyword) {
                                    var regS = new RegExp(keyword, "gi");
                                    // 优化：使用 $& 替代原来的 keyword，以保留原文原本的大小写形式
                                    match_content = match_content.replace(regS, "<em class=\"search-keyword\">$&</em>");
                                });

                                str += "<p class=\"search-result\">" + match_content + "</p>";
                            }
                            str += "</li>";
                        }
                    });
                    str += "</ul>";
                    $resultContent.innerHTML = str;
                });
            }
        }
    });
}