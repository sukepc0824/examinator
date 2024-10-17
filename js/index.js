$(function () {
    //起動時
    let editor_data = [];
    let exam_data = {};

    const queryString = window.location.search;
    const params = new URLSearchParams(queryString);
    const paramValue = params.get('id');

    var db = new Dexie("exam_db");

    db.version(1).stores({
        exam: `
        id,
        data,
        config`,
    })

    db.exam.get(paramValue).then((exam) => {
        exam_data = exam.config
        editor_data = exam.data
        $(".segment button[value='exam']").trigger("click")
        editor_data.forEach(function (value, parents_index) {
            new Large_question(value.large_data, parents_index).create()
            value.small_data.forEach(function (v, i) {
                new Small_question(v, i, parents_index).create()
            })
        })

        new Large_question(undefined, 0).select()

        Object.keys(exam_data).forEach(value => {
            $(`input.toggle[name="${value}"]`).prop('checked', exam_data[value]);
            $(`input.textbox[name="${value}"]`).val(exam_data[value]);
        })

        updata_data()
        setTimeout(() => {
            $(".loading").fadeOut()
        }, 100);
    })
        .catch((error) => {
            $("body").html("<p style='font-size:20px'>！エラー！模試が見つかりませんでした。URLを確認してください。5秒後にトップページに移動します。</p>")
            setTimeout(() => {
                location.href = 'index.html'
            }, 5000);
        });


    function large_sum(index) {
        if (editor_data[index] === undefined) {
            return 0;
        } else {
            if (exam_data.score_category) {
                return editor_data[index].small_data.map(obj => obj.score.skill).reduce((sum, element) => sum + element, 0) + editor_data[index].small_data.map(obj => obj.score.expression).reduce((sum, element) => sum + element, 0)
            } else {
                return editor_data[index].small_data.map(obj => obj.score.default).reduce((sum, element) => sum + element, 0)
            }
        }
    }

    function exam_sum() {
        let array = []
        editor_data.forEach(function (e, i) {
            array.push(large_sum(i))
        })
        return array.reduce((sum, element) => sum + element, 0);
    }

    function answer_set() {
        $(".answer-sheet .container").empty()

        editor_data.forEach((parents_value, parent_index) => {
            let $large = $(`
    <div class="answer-large page" data-id="${parent_index}">
    <p class="large-number">${parent_index + 1}</p>
    <div class="answer-small-container">
    </div>
    </div>`).appendTo(".container")

            parents_value.small_data.forEach((value, index) => {
                $small = $(`
        <div class="answer-small-content" data-id="${index}">
            <div class="number">(${index + 1})</div>
            <div class="small-answer ${value.category}">${value.answer.html}</div>
        </div>
        `).appendTo($large.find(".answer-small-container"))

                $small.css({
                    width: editor_data[parent_index].small_data[index].answer.width,
                    height: editor_data[parent_index].small_data[index].answer.height,
                })


                $(".answer-small-content").resizable({
                    minHeight: 48,
                    minWidth: 80,

                    stop: function (event, ui) {
                        updata_data()
                    }
                })
            })
        })

        $(".score div").text("/" + exam_sum())

        if (exam_data.score_category) {
            $(".category").show()
        } else {
            $(".category").hide()
        }

    }

    function exam_preview_set() {
        $(".exam-large").remove()
        $(".exam-preview h1").text(exam_data.subject)
        $(".exam-preview h2").text(exam_data.title)

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
                    <div class="exam-small-content">
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

        if (exam_data.score_visible) {
            $(".exam-preview p.score").show()
        } else {
            $(".exam-preview p.score").hide()
        }
    }


    $(".segment button").on("click", function () {
        $(`body>.answer,body>.exam, body>.exam-preview`).hide()
        $(`body>.${$(this).val()}`).show()

        $(".segment button").removeClass("active")
        $(this).addClass("active")

        answer_set()
        exam_preview_set()
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
            }
        });
    }

    function get_data() {
        let data = [];
        let exam_data = {};

        $(".large-box").each(function (index, element) {
            data.push({
                large_data: {
                    title: $(".tab").eq(index).find("p.main").text(),
                    html: $(element).find(".large-editor .ql-editor").html(),
                }, small_data: []
            })
        })

        $(".large-box .small-box").each(function (index, element) {
            data[$(element).parents(".large-box").data("id")].small_data.push({
                html: $(element).find(".simple-editor .ql-editor").html(),
                score: {
                    default: Number($(this).find("input.score.default").val()),
                    skill: Number($(this).find("input.score.skill").val()),
                    expression: Number($(this).find("input.score.expression").val())
                },
                category: $(this).find("select").val(),
                answer: {
                    html: $(this).find(".formula-editor .ql-editor").html(),
                    width: $(`.answer-large[data-id="${$(element).parents(".large-box").data("id")}"]`).find(`.answer-small-content[data-id="${$(this).index(".small-box")}"]`).width(),
                    height: $(`.answer-large[data-id="${$(element).parents(".large-box").data("id")}"]`).find(`.answer-small-content[data-id="${$(this).index(".small-box")}"]`).height()
                }
            })
            $(this).attr("category", $(this).find("select").val())
        })

        $(".property input.toggle").each(function () {
            exam_data[$(this).attr("name")] = $(this).prop("checked")
        })
        $(".property input.textbox").each(function () {
            exam_data[$(this).attr("name")] = $(this).val()
        })

        $(".title h2").text(`${exam_data.title} - ${exam_data.subject}`)

        editor_data = data
        exam_data = exam_data

        return [data, exam_data]
    }

    function updata_data() {
        $(".tab-menu").each(function (index) {
            $(this).data("tab-menu-id", index)
        })
        $(".large-box").each(function (parents_index, element) {
            $(".tabs-container .tab").eq(parents_index).find(".large-number").text(parents_index + 1)
            $(this).find("h2").text(parents_index + 1)
            $(".tab .title .sub").eq(parents_index).html(`配点:${large_sum(parents_index)}`)

            $(this).data("id", parents_index)
            $(element).find(".small-box").each(function (index) {
                $(this).find(".outline").html(`
                    <div class="outline-content">
                        <span>(${index + 1})</span>
                        <span class="ql-editor">
                            ${$(this).find(".simple-editor .ql-editor").html()}
                            <span class="outline-answer">
                                <p class="default">(${$(this).find("input.default").val() ? $(this).find("input.default").val() : 0}点) </p>
                                <p class="category">(知:${$(this).find("input.skill").val()}点 思:${$(this).find("input.expression").val()}点)</p>
                                ${$(this).find(".answer .ql-editor").html()}
                            </span>
                        </span>
                    </div>
                    `)
                $(this).find(".small-number").text(`(${index + 1})`)
            })
        })
        if (get_data()[1].score_category) {
            $(".category").show()
            $(".default").hide()
        } else {
            $(".category").hide()
            $(".default").show()
        }
        db.exam.update(paramValue, {
            data: get_data()[0],
            d_date: new Date(),
            config: get_data()[1]
        });
        //        $(".tab .title .sub").text(`小問:${editor_data[this.index].small_data.length} 配点:${large_sum(this.index)}`)
    }

    class Large_question {
        constructor(large_data, index) {
            this.data = large_data
            this.index = index
        }
        create() {
            let onetime_UUID = generateUUID()
            let $large = $(
                `
                <div class="large-box" data-id="${onetime_UUID}">
                    <h2>${this.index + 1}</h2>
                    <div class="editor-container">
                        <div class="large-editor"></div>
                    </div>
                    <div class="small-container">
                        <ul class="sortable"></ul>
                    </div>
                </div>
                `
            ).appendTo(".content")

            var toolbarOptions = [
                ['bold', 'italic', 'underline'],        // toggled buttons

                [{ 'list': 'ordered' }],

                ['image', "formula"]
            ];


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
            enableMathQuillFormulaAuthoring(quill, { operators: [["\\sqrt{x}", "\\nthroot"], ["\\cfrac{x}{y}", "\\cfrac"]] })

            $(`
            <li>
                <button class="tab drag-hundle" data-id="${onetime_UUID}">
                    <div class="large-number">${this.index + 1}</div>
                    <div class="title">
                        <p class="main">${this.data.title}</p>
                        <p class="sub">${large_sum(this.index)}</p>
                    </div>
                    <button class="menu">
                        <span class="material-symbols-outlined">
                            more_vert
                        </span>
                    </button>
                    <div class="webui-popover-content">
                        <div class="tab-menu" data-id="${onetime_UUID}">
                            <label>
                                タイトル:
                                <input type="text" class="textbox" placeholder="小問集合,単元名など" value="${this.data.title}">
                            </label>
                            <div class="action">
                                <button class="delete">
                                    <span class="material-symbols-outlined">
                                        delete
                                    </span>
                                    <p>削除</p>
                                </button>
                            </div>
                        </div>
                    </div>
                </button>
            </li>
            `).appendTo(".tabs-container ul");

            set_popover()

            $(".tabs-container").on("click", "button.tab", function () {
                new Large_question(undefined, $(this).index(".tab")).select()
            })

            updata_data()
        }
        select() {
            ui.selecting_large = this.index
            $(".tabs-container button.tab").removeClass("selection")
            $(`.tabs-container button.tab`).eq(this.index).addClass("selection")

            $(".large-box").hide()
            $(`.large-box[data-id="${$(`.tabs-container button.tab`).eq(this.index).data("id")}"]`).show()
            $(`.large-box[data-id="${$(`.tabs-container button.tab`).eq(this.index).data("id")}"]`).find("h2").html(this.index + 1)
        }
    }
    class Small_question {
        constructor(small_data, index, parents_index, select) {
            this.data = small_data
            this.index = index
            this.parents_index = parents_index
            this.select = select
        }
        create() {
            let onetime_UUID = generateUUID()
            let $small = $(
                `
                <li>
                    <div class="small-box" data-id="${onetime_UUID}">
                        <div class="editor-container">
                            <div class="outline" style="display: flex; gap:4px;"></div>
                            <div class="detail">
                                <div class="topbar">
                                    <div class="small-number">${`(${String(this.index + 1)})`}</div>
                                    <div class="input">
                                        <div class="score">
                                            点数:
                                            <input type="number" class="textbox score default" placeholder="0" value="${this.data.score.default}" min="0" max="100">
                                            <input type="number" class="textbox score category skill" placeholder="知技" value="${this.data.score.skill}" min="0" max="100">
                                            <input type="number" class="textbox score category expression" placeholder="思判表" value="${this.data.score.expression}" min="0" max="100">
                                        </div>
                                        <label class="selectbox">
                                            <select data-exam-data="category">
                                                <option value="short-write">短文記述</option>
                                                <option value="long-write">長文記述</option>
                                                <hr/>
                                                <option value="select-katakana">選択式 - カタカナ</option>
                                                <option value="select-number">選択式 - 数字</option>
                                                <option value="select-alphabet">選択式 - アルファベット</option>
                                                <hr/>
                                                <option>複数回答</option>
                                            </select>
                                        </label>
                                    </div>
                                </div>
                                <div class="editor">
                                    <div class="textarea">
                                        <div class="simple-editor"></div>
                                    </div>
                                    <div class="answer">
                                        <div class="formula-editor">${this.data.answer.html}</div>
                                    </div>
                                </div>
                                <div class="bottombar">
                                    <div class="left">
                                        <button class="delete hoverstyle" title="削除">
                                            <span class="material-symbols-outlined">
                                                delete
                                            </span>
                                        </button>
                                    </div>
                                    <div class="right">
                                        <label>
                                            文字(単語)数を制限:
                                            <input type="number" class="textbox letter" placeholder="制限なし" min="10" max="100">
                                        </label>
                                        <button class="copy hoverstyle" title="複製">
                                            <span class="material-symbols-outlined">
                                                content_copy
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="drag-hundle">
                            <span class="material-symbols-outlined">
                                drag_indicator
                            </span>
                        </div>
                    </div>
                </li>
                `
            ).appendTo($(`.large-box`).eq(this.parents_index).find("ul"))
            $small.find(`.selectbox select option[value="${this.data.category}"]`).prop("selected", true)

            $small.parents(".sortable").sortable({
                cancel: '',
                handle: '.drag-hundle',
                update: function () {
                    updata_data()
                },
                sort: function (event, ui) {
                    if (ui.offset.left + ui.helper.width() < 400) {
                        ui.helper.addClass("drop")
                        $(".tab").removeClass("hover")
                        $(document.elementFromPoint(event.clientX, event.clientY - 10)).addClass("hover")
                    } else {
                        ui.helper.removeClass("drop")
                    }
                },
                stop: function (event, ui) {
                    if ($(document.elementFromPoint(event.clientX, event.clientY - 10)).hasClass("tab")) {
                        ui.item.appendTo(`.large-box[data-id="${$(document.elementFromPoint(event.clientX, event.clientY - 10)).data("id")}"] ul.sortable`)
                        new Large_question(undefined, $(`.tab[data-id="${$(document.elementFromPoint(event.clientX, event.clientY - 10)).data("id")}"]`).index(".tabs-container .tab")).select()
                    }
                    ui.item.removeClass("drop");
                    $(".tab").removeClass("hover")

                    updata_data()
                }
            })


            const enableMathQuillFormulaAuthoring = mathquill4quill();

            let quill = new Quill($small.find(".simple-editor")[0], {
                theme: "snow",
                modules: {
                    toolbar: {
                        container: [
                            ['bold', 'italic', 'underline'],        // toggled buttons

                            [{ 'list': 'ordered' }],

                            ['image', "formula"]
                        ],
                    },
                    formula: true,
                    imageResize: {
                        displaySize: true
                    },
                },
                placeholder:
                    "小問...",
            })

            quill.root.innerHTML = this.data.html

            enableMathQuillFormulaAuthoring(quill, { operators: [["\\sqrt{x}", "\\nthroot"], ["\\frac{x}{y}", "\\frac"]] })
            new Quill($small.find(".formula-editor")[0], {
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

            if (this.select === true) {
                small_select($small.find(".small-box"))
            }

            updata_data()
        }
    }

    $(".tabs-container .sortable").sortable({
        cancel: '',
        update: function () {
            $(".tabs-container .tab").each(function () {
                $(`.large-box[data-id="${$(this).data("id")}"]`).appendTo(".content")
            })
            updata_data()
            updata_data()
        },
    })

    function small_deselect() {
        let prevheight = $(".small-box.selection").innerHeight()
        $element = $(".small-box.selection")

        $element.removeClass("selection")
        let height = $element.innerHeight()

        $(".small-box").removeClass("selection")

        $element.css("height", prevheight)

        $element.animate({
            height: height
        }, 250, "swing", function () {
            $(this).css("height", "auto")
        })
    }

    function small_select($this) {
        $this.addClass("selection")
        let height = $this.innerHeight()

        $(".small-box").removeClass("selection")
        let prevheight = $this.innerHeight()
        $this.addClass("selection")

        $this.css("height", prevheight)

        $this.animate({
            height: height
        }, 250, "swing", function () {
            $(this).css("height", "auto")
        })
        
    }

    $(document).on("mousedown", function (event) {
        if (!$(event.target).closest('.small-box').length) {
            updata_data()
            small_deselect()
        }
    })

    $(document).on("click", ".small-box:not(.selection)", function () {
        updata_data()
        small_deselect()
        small_select($(this))
    })

    $(".create-large").on("click", function () {
        new Large_question({
            html: ``,
            title: '名称未設定'
        }, editor_data.length).create()

        new Large_question(undefined, (editor_data.length - 1)).select()
    })


    $(".create-small").on("click", function () {
        new Small_question({
            html: ``,
            score: "",
            category: "",
            answer: {
                html: ""
            }
        }, 0, ui.selecting_large, true).create()
    })

    $(document).on("click", ".tab-menu button.delete", function () {
        let tab_menu_id = $(this).parents(".tab-menu").data("id")
        $("button.menu").webuiPopover('destroy');
        $(`.tabs-container .tab[data-id="${tab_menu_id}"]`).parents("li").remove()

        $(`.large-box[data-id="${tab_menu_id}"]`).remove()

        new Large_question(undefined, ($(`.tabs-container .tab[data-id="${tab_menu_id}"]`).parents("li").index(".tabs-container li"))).select()

        updata_data()
        set_popover()
    })

    $(document).on("change", ".small-box input.score", function () {
        updata_data()
    })

    $(".property input.toggle").on("change", function () {
        updata_data()
    })

    $(document).on("click", ".small-box button.delete", function () {
        $(this).parents("li").remove()
        updata_data()
    })

    $(document).on("click", ".bottombar button.copy", function () {
        $clone = $(this).parents("li").clone().appendTo($(this).parents(".small-container ul"))
        small_deselect()
        small_select($clone)

        updata_data()
    })

    $(".answer-preview button.reset").on("click", function () {
        $(".answer-preview .answer-small-content").removeAttr("style")
        updata_data()
    })

    $(document).on("blur", "select,input", function () {
        updata_data()
    })

    $("button.export").on("click", function () {
        updata_data()
        let blob = new Blob([JSON.stringify({
            data: exam_data,
            config: editor_data
        }, null, '  ')], { type: 'application\/json' });
        location.href = URL.createObjectURL(blob);
    })
})