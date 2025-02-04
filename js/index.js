$(function () {
    window.addEventListener('beforeunload', function (event) {
        updata_data()
    });

    let editor_data = [];
    let config = {};

    let db = new Dexie("exam_db");
    db.version(1).stores({
        exam: `
        id,
        data,
        config`,
    })

    const paramValue = new URLSearchParams(window.location.search).get('id');
    db.exam.get(paramValue).then((exam) => {

        //起動してデータベースが読み込まれた時の処理
        editor_data = exam.data;
        config = exam.config

        Object.keys(config).forEach(value => {
            $(`input.toggle[name="${value}"]`).prop('checked', config[value]);
            $(`input.textbox[name="${value}"]`).val(config[value]);
            $(`textarea[name="${value}"]`).val(config[value]);
        })

        answer_set()

        editor_data.forEach(function (value, parents_index) {
            new Large_question(value.large_data, parents_index).create()
            value.small_data.forEach(function (v, i) {
                new Large_question(undefined, parents_index).append_small(v)
            })
        })

        new Large_question(undefined, 0).select()

        setTimeout(() => {
            $(".loading").fadeOut()
        }, 100);

        $("header .segment button[value='exam']").trigger("click")
        $(".sidebar .segment button[value='large-section']").trigger("click")
    })
        .catch((error) => {
            alert("?ファイルが見つかりません" + error)
            console.log("開発者向け" + error)
            location.href = 'index.html'
        });

    const toolbarOptions = [
        ['bold', 'italic', 'underline'],
        [{ 'list': 'ordered' }],
        ['image', "formula"]
    ];

    function focusAndPlaceCaretAtEnd(el) {
        el.focus();
        if (typeof window.getSelection != "undefined"
            && typeof document.createRange != "undefined") {
            var range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (typeof document.body.createTextRange != "undefined") {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(el);
            textRange.collapse(false);
            textRange.select();
        }
    }

    function setPageSize(cssPageSize) {
        const style = document.createElement('style');
        style.innerHTML = `@page {size: ${cssPageSize}}`;

        document.head.appendChild(style);
    }

    function large_sum(index) {
        let sum_array = []
        if (editor_data[index] === undefined) {
            return 0;
        } else {
            editor_data[index].small_data.forEach((element, index) => {
                sum_array.push(Number(element.score.default) * element.answer.length + Number(element.score.skill) * element.answer.length + Number(element.score.expression) * element.answer.length)
            })
            return sum_array.reduce((sum, element) => sum + element, 0)
        }
    }

    function exam_category_sum(category) {
        let array = []
        editor_data.forEach(function (e, i) {
            array.push(category_sum(i, category))
        })
        return array.reduce((sum, element) => sum + element, 0);
    }

    function category_sum(index, category) {
        let sum_array = []
        if (editor_data[index] === undefined) {
            return 0;
        } else {
            editor_data[index].small_data.forEach((element, index) => {
                sum_array.push(Number(element.score[category]) * element.answer.length)
            })
            return sum_array.reduce((sum, element) => sum + element, 0)
        }
    }

    function toCircled(num) {
        if (num <= 20) {
            const base = '①'.charCodeAt(0);
            return String.fromCharCode(base + num - 1);
        }
        if (num <= 35) {
            const base = '㉑'.charCodeAt(0);
            return String.fromCharCode(base + num - 21);
        }
        const base = '㊱'.charCodeAt(0);
        return String.fromCharCode(base + num - 36);
    }

    function exam_sum() {
        let array = []
        editor_data.forEach(function (e, i) {
            array.push(large_sum(i))
        })
        return array.reduce((sum, element) => sum + element, 0);
    }

    function answer_set() {
        $(".answer-sheet p.title").html(config.subject + " " + config.title + " 解答用紙")
        $(".answer-sheet .container .answer-large").remove()

        editor_data.forEach((parents_value, parent_index) => {
            $(".answer-sheet .container").loadTemplate($(".answer-large_templete"), {
                UUID: parents_value.large_data.UUID,
                number: parent_index + 1
            }, { append: true })

            let $large = $(`.answer-large[data-id="${parents_value.large_data.UUID}"]`)

            parents_value.small_data.forEach((value, index) => {
                ($large.find(".answer-small-container")).loadTemplate($(".answer-small_templete"), {
                    UUID: value.UUID,
                    number: `(${index + 1})`,
                    category: value.category,
                }, { append: true })

                let $small = $(`.answer-small[data-id="${value.UUID}"]`)

                value.answer.forEach((answer_value, answer_index) => {
                    ($small.find(".answer-frame-container")).loadTemplate($(".answer-frame_templete"), {
                        number: toCircled(answer_index + 1),
                        answer_html: answer_value.html,
                    }, { append: true })

                    $small.find(".answer-frame").eq(answer_index).css({
                        width: editor_data[parent_index].small_data[index].answer[answer_index].width,
                        height: editor_data[parent_index].small_data[index].answer[answer_index].height,
                    })
                })

                if (value.answer.length === 1) {
                    $small.find(".answer-frame-container .number").hide()
                }

                if (value.answer[0].limit != 0) {
                    for (let i = 0; i < value.answer[0].limit; i++) {
                        $(`<div class="text-limit-box">${[...(value.answer[0].html).replace("<p>", "").replace("</p>", "")][i] ? [...(value.answer[0].html).replace("<p>", "").replace("</p>", "")][i] : ""}</div>`).appendTo($small.find(".answer-frame"))
                    }
                }

                $(".answer-frame").resizable({
                    grid: [21, 42],
                })
            })
        })

        $(".score div").text("/" + exam_sum())
        $(".category.skill .sum").text(exam_category_sum("skill")+"点")
        $(".category.expression .sum").text(exam_category_sum("expression")+"点")

        if (config.score_category) {
            $(".category").show()
        } else {
            $(".category").hide()
        }

        setPageSize('B4 portrait');

    }

    function exam_preview_set() {
        $(".exam-large").remove()
        $(".exam-preview h1").text(config.subject.length ? config.subject : "未設定")
        $(".exam-preview h2").text(config.title.length ? config.title : "名称未設定")
        $(".exam-preview .cover p").text(config.cover_text)

        editor_data.forEach((parents_value, parent_index) => {
            let $large = $(`
            <div class="exam-large page">
                <p class="score">(配点 ${large_sum(parent_index)})</p>
                <div class="exam-large-content">
                ${parents_value.large_data.html}
                </div>
            </div>`).appendTo(".exam-preview .exam")

            $(`<span class="large-number">${parent_index + 1}</span>`).prependTo($large.find(".exam-large-content p:first"))

            parents_value.small_data.forEach((value, index) => {
                $(`
                    <div class="exam-small-content ${value.category}">
                        <div class="number">(${index + 1})</div>
                        <div>${value.html}</div>
                    </div>
                    `).appendTo($large)
            })
        });

        $(".large-box").each(function () {
            $(`<div class="exam-large">
                <div class="exam-large-content">
                </div>
                <div class="exam-small-container">
                </div>
            </div>`).appendTo(".exam-sheet")
        })

        if (config.score_visible) {
            $(".exam-preview p.score").show()
        } else {
            $(".exam-preview p.score").hide()
        }

        setPageSize('B5 portrait');
    }


    $("header .segment button").on("click", function () {
        $(`body>.answer,body>.exam, body>.exam-preview`).hide()
        $(`body>.${$(this).val()}`).show()

        updata_data()
        $("header .segment button").removeClass("active")
        $(this).addClass("active")
        if ($(this).val() === "exam-preview") {
            exam_preview_set()
        } else if ($(this).val() === "answer") {
            answer_set()
        }
    })

    $(".sidebar .segment button").on("click", function () {
        $(`.sidebar .large-section`).hide()
        $(`.${$(this).val()}`).show()

        $(".sidebar .segment button").removeClass("active")
        $(this).addClass("active")
    })

    ui = {
        selecting_large: 0
    }

    function set_popover() {
        $('button.title,button.menu').webuiPopover({
            title: "編集",
            animation: 'pop',
            closeable: true,
            onHide: function ($element) {
                $(`.tabs-container button.tab[data-id=${$element.find(".tab-menu").data("id")}]`)
                    .find("p.main")
                    .text($element.find("input").val().length ?
                        $element.find("input").val() : "名称未設定")

                updata_data()
                answer_set()
                exam_preview_set()
                config_refresh()
            }
        });
    }

    function get_data() {
        let data = [];
        let config = {};

        $(".property input.toggle").each(function () {
            config[$(this).attr("name")] = $(this).prop("checked")
        })
        $(".property input.textbox").each(function () {
            config[$(this).attr("name")] = $(this).val()
        })
        $(".property textarea").each(function () {
            config[$(this).attr("name")] = $(this).val()
        })

        $(".large-box").each(function (parent_index, parent_element) {
            data.push({
                large_data: {
                    UUID: $(this).attr("data-id"),
                    title: $(".tab").eq(parent_index).find("p.main").text(),
                    html: $(parent_element).find(".large-editor .ql-editor").html(),
                }, small_data: []
            })

            $(parent_element).find(".small-box").each(function (index, element) {
                data[parent_index].small_data.push({
                    UUID: $(this).attr("data-id"),
                    html: $(element).find(".simple-editor .ql-editor").html(),
                    score: {
                        default: 0,
                        skill: 0,
                        expression: 0
                    },
                    category: $(this).find(".select-category").val(),
                    answer: []
                })

                if (config.score_category) {
                    data[parent_index].small_data[index].score[$(this).find(".score_category").val()] = Number($(this).find("input.score").val())
                } else {
                    data[parent_index].small_data[index].score.default = Number($(this).find("input.score").val())
                }

                $(element).find(".formula-editor").each(function (answer_index) {
                    data[parent_index].small_data[index].answer.push({
                        limit: Number($(element).find("input.limit").val() ? $(element).find("input.limit").val() : 0),
                        html: $(this).find(".ql-editor").html(),
                        width: $(`.answer-small[data-id="${$(element).attr("data-id")}"]`).find(`.answer-frame`).eq(answer_index).width(),
                        height: $(`.answer-small[data-id="${$(element).attr("data-id")}"]`).find(`.answer-frame`).eq(answer_index).height()
                    })
                })

                $(this).attr("category", $(this).find(".select-category").val())
            })
        })

        return [data, config]
    }

    function config_refresh() {
        if (get_data()[1].exam_cover) {
            $(".page.cover").show()
        } else {
            $(".page.cover").hide()
        }

        if (get_data()[1].score_category) {
            $(".category").show()
            $(".default").hide()
        } else {
            $(".category").hide()
            $(".default").show()
        }

        let title = `${config.title.length ? config.title : '名称未設定'} － ${config.subject.length ? config.subject : '未設定'}`
        document.title = title
        $(".title h2").text(title)
    }

    function updata_data() {

        editor_data = get_data()[0]
        config = get_data()[1]

        db.exam.update(paramValue, {
            data: get_data()[0],
            config: get_data()[1],
            d_date: new Date(),
        });
    }

    class Large_question {
        constructor(large_data, index) {
            this.data = large_data
            this.index = index
        }
        create() {
            let UUID = this.data.UUID != undefined ? this.data.UUID : generateUUID()
            $(".content").loadTemplate($(".large-box_template"), {
                UUID: UUID,
                number: this.index + 1
            }, { append: true })
            let $large = $(`.large-box[data-id="${UUID}"]`)

            let quill = new Quill($large.find(".large-editor")[0], {
                theme: 'snow',
                modules: {
                    toolbar: {
                        container: toolbarOptions,
                    },
                    formula: true,
                    imageResize: {
                        displaySize: true
                    },
                },
                placeholder:
                    "大問を記述...",
            });

            quill.root.innerHTML = this.data.html

            const enableMathQuillFormulaAuthoring = mathquill4quill();
            enableMathQuillFormulaAuthoring(quill, { operators: [["\\sqrt{x}", "\\sqrt"], ["\\cfrac{x}{y}", "\\cfrac"], ["_n C_r", "_n C_r"]] })
            quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
                let ops = []
                delta.ops.forEach(op => {
                    if (op.insert && typeof op.insert === 'string') {
                        ops.push({
                            insert: op.insert
                        })
                    }
                })
                delta.ops = ops
                return delta
            })

            $(".tabs-container ul").loadTemplate($(".tab_template"), {
                UUID: UUID,
                number: this.index + 1,
                title: this.data.title.length ? this.data.title : '名称未設定',
                sum: large_sum(this.index)
            }, { append: true })
            set_popover()

            let $tab = $(`.tab[data-id="${UUID}"]`)

            $(".tabs-container").on("click", "button.tab", function () {
                new Large_question(undefined, $(this).index(".tab")).select()
            })

            $(".tabs-container .sortable").sortable({
                cancel: '',
                distance: 10,
                update: function (event,ui) {
                    $(".tabs-container .tab").each(function () {
                        $(`.large-box[data-id="${$(this).data("id")}"]`).appendTo(".content")
                    })
                    Large_question.refresh()
                    new Large_question(undefined,$(".tab").index(ui.item.find(".tab")))
                },
            })

            $(document).on("click", ".tab-menu button.delete", function () {
                let tab_menu_id = $(this).parents(".tab-menu").data("id")
                $("button.menu").webuiPopover('destroy');
                $(`.tabs-container .tab[data-id="${tab_menu_id}"]`).parents("li").remove()

                $(`.large-box[data-id="${tab_menu_id}"]`).remove()

                new Large_question(undefined, ($(`.tabs-container .tab[data-id="${tab_menu_id}"]`).parents("li").index(".tabs-container li"))).select()

                Large_question.refresh()
                set_popover()
            })

            Large_question.refresh()
        }

        static refresh() {
            $(".large-box").each(function (parents_index) {
                $(".tabs-container .tab").eq(parents_index).find(".large-number").text(parents_index + 1)
                $(this).find("h2").text(parents_index + 1)
                
                $(this).data("id", parents_index)
                $(".tab .title .sub").eq(parents_index).html(`配点:${large_sum(parents_index)}`)

                $(this).find(".small-box").each(function (index) {
                    $(this).find(".small-number").text("(" + (index + 1) + ")")
                })
            })
            updata_data()
            config_refresh()
        }

        select() {
            ui.selecting_large = this.index
            $(".tabs-container button.tab").removeClass("selection")
            $(`.tabs-container button.tab`).eq(this.index).addClass("selection")

            $(".large-box").hide()
            $(`.large-box[data-id="${$(`.tabs-container button.tab`).eq(this.index).data("id")}"]`).show()
            $(`.large-box[data-id="${$(`.tabs-container button.tab`).eq(this.index).data("id")}"]`).find("h2").html(this.index + 1)
        }

        append_small(data) {
            let UUID = data.UUID != undefined ? data.UUID : generateUUID();

            $(`.large-box`).eq(this.index).find("ul").loadTemplate($(".small-box_template"), {
                UUID: UUID,
                number: String(this.index + 1),
                default: data.score.default + data.score.skill + data.score.expression != 0 ? data.score.default + data.score.skill + data.score.expression : "",
                answer_limit: data.answer[0].limit != 0 ? data.answer[0].limit : ''
            }, {
                append: true
            })

            let $small = $(`.small-box[data-id="${UUID}"]`)

            if (config.score_category) {
                $small.find(`.selectbox .score_category option[value="${data.score.expression == 0 ? 'skill' : 'expression'}"]`).prop("selected", true)
            }

            $small.find(`.selectbox .select-category option[value="${data.category}"]`).prop("selected", true)

            if (data.answer.length) {
                data.answer.forEach((value, index) => {
                    new Small_question(UUID).append_answer(value.html)
                })
            } else {
                new Small_question(UUID).append_answer(value.html)
            }

            new Small_question(UUID).refresh()

            $small.parents(".sortable").sortable({
                cancel: '',
                handle: '.drag-hundle',
                sort: function (event, ui) {
                    if (ui.offset.left + ui.helper.width() < 400) {
                        ui.helper.addClass("drop")
                        $(".tab").removeClass("hover")
                        $(document.elementFromPoint(event.clientX, event.clientY)).addClass("hover")
                    } else {
                        ui.helper.removeClass("drop")
                    }
                },
                stop: function (event, ui) {
                    if ($(document.elementFromPoint(event.clientX, event.clientY)).hasClass("tab")) {
                        ui.item.appendTo(`.large-box[data-id="${$(document.elementFromPoint(event.clientX, event.clientY)).data("id")}"] ul.sortable`)
                        new Large_question(undefined, $(`.tab[data-id="${$(document.elementFromPoint(event.clientX, event.clientY)).data("id")}"]`).index(".tabs-container .tab")).select()
                        $(".sortable").sortable("refresh");
                    }
                    ui.item.removeClass("drop");
                    $(".tab").removeClass("hover")
                    Large_question.refresh()
                }
            })

            //answerの削除
            $small.on("click", ".answer button.delete", function () {
                let id = $(this).parents(".small-box").data("id")
                let index = $(this).parents(".small-box").find(".answer").index($(this).parents(".answer"))
                new Small_question(id).remove_answer(index)
            })

            //smallの削除
            $small.on("click", ".bottombar button.delete", function () {
                new Small_question($(this).parents(".small-box").data("id")).remove()
            })

            //点数更新
            $small.on("change", "input.score", function () {
                Large_question.refresh()
            })

            //answerの追加
            $small.on("click", "button.add-answer", function () {
                new Small_question($(this).parents(".small-box").data("id")).append_answer('')
            })

            $small.on("change", "select.select-category", function () {
                new Small_question(UUID).refresh()
            })

            //smallの複製
            /*
            $small.on("click", ".bottombar button.copy", function () {
                $clone = $(this).parents("li").clone().appendTo($(this).parents(".small-container ul"))
                Small_question.deselect()
                Small_question.select($(this).data("id"))
                updata_data()
            })*/

            let quill = new Quill($small.find(".simple-editor")[0], {
                theme: "snow",
                modules: {
                    toolbar: toolbarOptions,
                    formula: true,
                    imageResize: {
                        displaySize: true
                    },
                },
                placeholder:
                    "小問...",
            })
            quill.root.innerHTML = data.html

            const enableMathQuillFormulaAuthoring = mathquill4quill();
            enableMathQuillFormulaAuthoring(quill, { operators: [["\\sqrt{x}", "\\sqrt"], ["\\cfrac{x}{y}", "\\cfrac"], ["_n C_r", "_n C_r"]] })
            quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
                let ops = []
                delta.ops.forEach(op => {
                    if (op.insert && typeof op.insert === 'string') {
                        ops.push({
                            insert: op.insert
                        })
                    }
                })
                delta.ops = ops
                return delta
            })
            Large_question.refresh()
            new Small_question(UUID).refresh()

            return UUID
        }
    }

    class Small_question {
        constructor(small_UUID) {
            this.id = small_UUID
            this.$small = $(`.small-box[data-id='${this.id}']`)
        }

        refresh() {
            let answer_list = []
            this.$small.find(".answer .ql-editor").each(function (index) {
                answer_list.push(
                    `<div class="answer-item">
                        <p class="number">${toCircled(index + 1)}</p>
                        ${$(this).html() != '<p><br></p>' ? $(this).html() : '解答未設定'}
                    </div>`)
            })
            this.$small.find(".outline-editor-content").html(this.$small.find(".simple-editor .ql-editor").html() != '<p><br></p>' ? this.$small.find(".simple-editor .ql-editor").html() : "小問未設定")
            this.$small.find(".outline-answer-content").html(answer_list.join(""))

            this.$small.find(".score-category").html(this.$small.find(".score_category").val() === 'skill' ? "知技" : "思判表")
            this.$small.find(".each-score").html(this.$small.find(".editor .answer").length > 1 ? '各' : '')
            this.$small.find(".default-score").html(this.$small.find("input.score").val() ? this.$small.find("input.score").val() : 0)

            config_refresh()
        }

        static deselect() {
            let prevheight = $(".small-box.selection").innerHeight()
            let $element = $(".small-box.selection")

            new Small_question($element.data("id")).refresh()

            $element.removeClass("selection")
            let height = $element.innerHeight()

            $(".small-box").removeClass("selection")

            $element.css("height", prevheight)

            $element.animate({
                height: height
            }, 190, "swing", function () {
                $(this).css("height", "auto")
            })
        }

        select(select) {
            this.$small.addClass("selection")
            let height = this.$small.innerHeight()

            $(".small-box").removeClass("selection")
            let prevheight = this.$small.innerHeight()
            this.$small.addClass("selection")

            this.$small.css("height", prevheight)

            this.$small.animate({
                height: height
            }, 190, "swing", function () {
                $(this).css("height", "auto")

                if (select === "editor") {
                    let $small_editor = $(this).find(".editor .textarea .ql-editor")
                    $small_editor.focus();
                    focusAndPlaceCaretAtEnd($small_editor[0]);
                } else if (select === "answer") {
                    let $small_editor = $(this).find(".editor .textarea .ql-editor")
                    $small_editor.focus();
                    focusAndPlaceCaretAtEnd($small_editor[0]);
                }
            })
        }

        remove() {
            this.$small.parents("li").remove()
            Large_question.refresh()
        }

        append_answer(data) {
            this.$small.find(".editor").loadTemplate($(".answer_templete"), {
                data
            }, { append: true })

            let $answer = this.$small.find(".editor .answer").last()

            let answer_quill = new Quill($answer.find('.formula-editor')[0], {
                theme: "snow",
                modules: {
                    toolbar: {
                        container: ["formula"],
                    },
                    formula: true,
                },
                placeholder:
                    "模範解答...",
            })
            answer_quill.root.innerHTML = data
            this.remove_answer()

            const enableMathQuillFormulaAuthoring = mathquill4quill();
            enableMathQuillFormulaAuthoring(answer_quill, { operators: [["\\sqrt{x}", "\\sqrt"], ["\\cfrac{x}{y}", "\\cfrac"], ["_n C_r", "_n C_r"]] })
            answer_quill.clipboard.addMatcher(Node.ELEMENT_NODE, (node, delta) => {
                let ops = []
                delta.ops.forEach(op => {
                    if (op.insert && typeof op.insert === 'string') {
                        ops.push({
                            insert: op.insert
                        })
                    }
                })
                delta.ops = ops
                return delta
            })
            Large_question.refresh()
        }

        remove_answer(index) {
            this.$small.find(".editor .answer").eq(index).remove()
            this.answer_refresh()
            Large_question.refresh()
        }

        answer_refresh() {
            if (this.$small.find(".editor .answer").length > 1) {
                this.$small.find('.editor .answer').each(function (index) {
                    $(this).find("p.number").text(toCircled(index + 1))
                })
                this.$small.find('label.answer_limit .limit').val(0)
                this.$small.addClass("multiple-answer")
            } else {
                this.$small.removeClass("multiple-answer")
            }
            Large_question.refresh()
        }
    }

    $(document).on("mousedown", function (event) {
        if (!$(event.target).closest('.small-box').length && $("button[value='exam']").hasClass('active') && $(".small-box.selection").length) {
            Small_question.deselect()
        }
    })

    $(document).on("mousedown", ".small-box:not(.selection)", function (event) {
        Small_question.deselect()
        if ($(event.target).parents(".drag-hundle").length) {
            return false;
        }
        if ($(event.target).parents(".outline-editor-content").length) {
            new Small_question($(this).data("id")).select("editor")
        } else if ($(event.target).parents(".outline-answer-content").length) {
            new Small_question($(this).data("id")).select("answer")
        } else {
            new Small_question($(this).data("id")).select()
        }
    })

    $(".create-large").on("click", function () {
        new Large_question({
            html: ``,
            title: ''
        }, editor_data.length).create()

        new Large_question(undefined, (editor_data.length - 1)).select()
    })

    $(".create-small").on("click", function () {
        let data = {
            html: `<br>`,
            score: {
                default: 0,
                skill: 0,
                expression: 0
            },
            category: "",
            answer: [{ html: '', limit: '', width: '', height: '' }]
        }
        let id = new Large_question(undefined, ui.selecting_large).append_small(data)
        new Small_question(id).select()
        $('.content').scrollTop($('.content')[0].scrollHeight);
    })

    $("button.save").on("click", updata_data())

    $(".answer-preview button.reset").on("click", function () {
        $(".answer-preview .answer-frame").removeAttr("style")
        updata_data()
    })

    $(".hide-answer").on("click", function () {
        if ($(this).prop("checked")) {
            $(".answer-frame-answer").hide()
        } else {
            $(".answer-frame-answer").show()
        }
    })

    $("button.export").on("click", function () {
        updata_data()

        var resultJson = JSON.stringify({
            data: editor_data,
            config: config
        });
        var downLoadLink = document.createElement("a");
        downLoadLink.download = config.title + '_result.json';
        downLoadLink.href = URL.createObjectURL(new Blob([resultJson], { type: "text.plain" }));
        downLoadLink.dataset.downloadurl = ["text/plain", downLoadLink.download, downLoadLink.href].join(":");
        downLoadLink.click();
    })

})