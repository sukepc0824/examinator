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
})
    .catch((error) => {
        $(function () {
            $("body").html("エラー")
        })
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