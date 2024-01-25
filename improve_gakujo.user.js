// ==UserScript==
// @name         Improve Gakujo
// @namespace    https://github.com/yuu528/ImproveGakujo
// @version      2.2.1
// @description  improve gakujo.shizuoka.ac.jp
// @author       Yuu528
// @match        https://gakujo.shizuoka.ac.jp/portal/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gakujo.shizuoka.ac.jp
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // color data
    var deadlineColorDic = [
        ['#c0c0c0', '締切(未提出)'],
        ['#ffb7b7', '残り1日'],
        ['#ffff7f', '残り3日'],
        ['#bfff7f', '残り7日'],
        ['#b7dbff', '残り8日以上']
    ];

    var unreadColorDic = [
        ['#ffb7b7', '未読']
    ];

    // dom will be used
    var searchListWrap;
    var searchListInfo;

    // classes
    class ArraySessionStorage {
        #key;
        #data;

        constructor(key) {
            this.#key = key;
            this.#data = [];

            let rawJson = sessionStorage.getItem(key);
            if(rawJson != null) {
                try {
                    this.#data = JSON.parse(rawJson);
                } catch(e) {
                    console.error(e);
                    console.log('sessionStorage: ' + key + ' is cleared.');
                    this.save();
                }
            } else {
                this.save();
            }
        }

        save() {
            sessionStorage.setItem(this.#key, JSON.stringify(this.#data));
        }

        get() {
            return this.#data;
        }

        push(datum) {
            this.#data.push(datum);
            this.save();
        }

        pop(count) {
            let datum = this.#data.pop();
            this.save();
            return datum;
        }

        peek() {
            return this.#data[this.#data.length - 1];
        }

        set(data) {
            this.#data = data;
            this.save();
        }
    }

    class CustomColorStorage {
        #data;
        #enable;

        constructor() {
            this.#data = ['#3b67a2', '#6691cc', '#d3e2eb', '#e7eef1', '#efefef'];
            this.#enable = false;

            let enabled = localStorage.getItem('enableCustomColor');
            if(enabled == 'true') {
                this.#enable = true;
            }

            let rawJson = localStorage.getItem('customColors');
            if(rawJson != null) {
                try {
                    this.#data = JSON.parse(rawJson);
                } catch(e) {
                    console.error(e);
                    console.log('localStorage: customColors is cleared.');
                    this.save();
                }
            } else {
                this.save();
            }

            this.#data.forEach(color => {
                if(!this.#isColor(color)) {
                    this.#data = ['#3b6a72', '#6691cc', '#d3e2eb', '#e7eef1', '#efefef'];
                    this.save();
                }
            })
        }

        #isColor(str) {
            var s = new Option().style;
            s.color = str;
            return s.color !== '';
        }

        save() {
            localStorage.setItem('customColors', JSON.stringify(this.#data));
            localStorage.setItem('enableCustomColor', this.#enable.toString());
        }

        get(key) {
            return this.#data[key];
        }

        set(key, datum) {
            this.#data[key] = datum;
            this.save();
        }

        isEnabled() {
            return this.#enable;
        }

        setEnable(enable) {
            this.#enable = enable;
            this.save();
        }
    }

    var historyStorage = new ArraySessionStorage('onClickHistory');
    var colorStorage = new CustomColorStorage();

    // functions
    var addColorNotes = colorArray => {
        let textWithBg = document.createElement('span');

        textWithBg.style.marginRight = '1em';
        searchListInfo.style.width = 'auto';
        searchListInfo.nextElementSibling.style.cssText += 'width: auto !important;';

        // show color notes
        colorArray.forEach(data => {
            textWithBg.style.backgroundColor = data[0];
            textWithBg.innerText = data[1];
            searchListInfo.prepend(textWithBg.cloneNode(true));
        });
    }

    var colorDeadlineCells = () => {
        let tableRow = document.querySelectorAll('#searchList tr');
        // find deadline cell
        var cellNum = parseInt(Object.entries(document.querySelectorAll('#searchList th')).find(([id, elm]) => elm.innerText == '提出期間')[0]);
        Array.prototype.forEach.call(tableRow, elm => {
            if(elm.children[cellNum + 1].innerText == '未提出' || elm.children[cellNum + 1].innerText == '') {
                // get deadline date
                let date = new Date(elm.children[cellNum].innerText.split(' ～ ')[1]);
                if(date.getTime() != NaN) {
                    // diff second [sec]
                    let diffSec = Math.floor((date.getTime() - new Date().getTime()) / 1000);
                    if(diffSec < 0) {
                        elm.children[cellNum].style.backgroundColor = deadlineColorDic[0][0];
                    } else if(diffSec <= 86400) {
                        elm.children[cellNum].style.backgroundColor = deadlineColorDic[1][0];
                    } else if(diffSec <= 86400 * 3) {
                        elm.children[cellNum].style.backgroundColor = deadlineColorDic[2][0];
                    } else if(diffSec <= 86400 * 7) {
                        elm.children[cellNum].style.backgroundColor = deadlineColorDic[3][0];
                    } else {
                        elm.children[cellNum].style.backgroundColor = deadlineColorDic[4][0];
                    }
                }
            }
        });
    }

    var colorUnreadCells = () => {
        let tableRow = document.querySelectorAll('.dataTables_wrapper tr');
        // find title cell
        var cellNum = parseInt(Object.entries(document.querySelectorAll('.dataTables_wrapper th')).find(([id, elm]) => elm.innerText == 'タイトル')[0]);
        Array.prototype.forEach.call(tableRow, elm => {
            if(elm.children[cellNum].innerText.indexOf('（未読）') != -1) {
                elm.children[cellNum].style.backgroundColor = unreadColorDic[0][0];
            }
        });
    }

    var rgbHexCalc = (hex, diff) => {
        if(/^#[0-9a-fA-F]{6}$/.test(hex)) {
            let rgbVal = hex.slice(1).match(/.{2}/g);
            return '#' + (rgbVal.map(str => {
                let out = parseInt(str, 16) + diff;
                return ((out > 255) ? 255 : out).toString(16);
            }).join(''));
        } else {
            return hex;
        }
    }

    var updateCustomColor = () => {
        if(colorStorage.isEnabled()) {
            var newCss = `
a:visited,
a:hover,
#left-box .list-arrow li a:hover{
	color:${colorStorage.get(1)};
}
#header {
	background:${colorStorage.get(2)} !important;
}
#hnav {
	background: linear-gradient(${colorStorage.get(0)} 30px, #afb3b4 30px, #dedede 31px);
}
#header #header-navi{
	background: linear-gradient(${colorStorage.get(0)} 30px, #afb3b4 30px, #dedede 31px);
}
#header #header-navi ul#header-menu li a:hover,
#header #header-navi ul#header-menu li:hover a.d_menu,
#header #header-navi ul#header-cog li:hover a.d_menu,
#header #header-navi p.logout a.timer_info:hover{
	background-color: ${rgbHexCalc(colorStorage.get(0), 30)};
}
ul.nav_h ul li{
	border-left: 1px solid ${colorStorage.get(1)};
	border-right: 1px solid ${colorStorage.get(1)};
	background-color: ${colorStorage.get(1)};
}
ul.nav ul li a{
	border-left: 1px solid ${colorStorage.get(1)};
}
ul.nav_h ul li.start,
ul.nav ul li.start{
	border-top: 1px solid ${colorStorage.get(1)};
}
ul.nav_h ul li.end,
ul.nav ul li.end{
	border-bottom: 1px solid ${colorStorage.get(1)};
}
#header #header-navi ul#header-menu-sub li a:hover,
#header #header-navi ul#header-cog-sub li a:hover{
	background-color: ${colorStorage.get(0)};
}
#footer-upper {
	background-color:${colorStorage.get(2)};
}
#header #gnav{
	background: linear-gradient(#dedede 1px, #fff 3px, ${colorStorage.get(3)} 17px, ${colorStorage.get(3)} 35px, rgba(102, 102, 102, 0.4) 35px, rgba(0, 0, 0, 0));
}
.nav li a.gnav:hover,
.nav li:hover a.gnav01,
.nav li:hover a.gnav02,
.nav li:hover a.gnav03,
.nav li:hover a.gnav04,
.nav li:hover a.gnav05,
.nav li:hover a.gnav06,
.nav li:hover a.gnav07,
.nav li:hover a.gnav08,
.nav li:hover a.gnav09,
.nav li:hover a.gnav10,
.nav li:hover a.gnav11,
.nav li:hover a.gnav12,
.nav li:hover a.gnav13,
.nav li:hover a.gnav14 {
	color:${colorStorage.get(1)};
	border-left: 1px solid ${colorStorage.get(1)};
	border-right: 1px solid ${colorStorage.get(1)};
}
#personal-box #personal-right #last-login {
	background-color:${colorStorage.get(3)};
}
h2 {
	color:${colorStorage.get(1)};
}
.tab-box-inner p#info_more a:hover span{
	color: ${colorStorage.get(1)};
}
#right-box-top .tab-box {
	background-color:${colorStorage.get(3)};
}

#right-box-top .tab-box-top {
	background-color:${colorStorage.get(3)};
	padding-top: 5px
}
#right-box-top .tab-box-top.tab1 {
	background-color:${colorStorage.get(3)};
	padding-top: 5px
}
.tab-box {
	background-color:${colorStorage.get(3)};
}
.portfolio-box h4 {
	color:${colorStorage.get(1)};
}
h3 span.h3_icon {
	background:linear-gradient(${colorStorage.get(1)}, ${colorStorage.get(0)}) left/4px 40px no-repeat;
}
table.ttb_base th,
table.ttb_sheet th,
table.ttb_entry th,
table#tbl_disp th,
table.display thead th,
table.display thead th:hover,
#right-box .search-box th {
	background-color:${colorStorage.get(1)};
}
table.ttb_entry th.th_summary{
	background-color: ${colorStorage.get(3)};
}
#right-box table.ttb_entry.bg-color th,
#right-box table.ttb_base.bg-color th,
#right-box table.ttb_sheet.bg-color th {
	background-color:${colorStorage.get(3)};
}
.menu_head,
.menu_head01,
.menu_head02,
.menu_head03,
.menu_head04,
.menu_head05,
.menu_head06,
.menu_head07,
.menu_head08,
.menu_head09,
.menu_head10,
.menu_head11,
.menu_head12 {
   background-color: ${colorStorage.get(3)};
}
.menu_head:hover,
.menu_head01:hover,
.menu_head02:hover,
.menu_head03:hover,
.menu_head04:hover,
.menu_head05:hover,
.menu_head06:hover,
.menu_head07:hover,
.menu_head08:hover,
.menu_head09:hover,
.menu_head10:hover,
.menu_head11:hover,
.menu_head12:hover {
   background-color: ${colorStorage.get(3)};
}
.menu_body a,
.menu_body01 a,
.menu_body02 a,
.menu_body03 a,
.menu_body04 a,
.menu_body05 a,
.menu_body06 a,
.menu_body07 a,
.menu_body08 a,
.menu_body09 a,
.menu_body10 a,
.menu_body11 a,
.menu_body12 a{
	border-bottom:1px solid ${colorStorage.get(1)};
}
#SC_A00_01.p01-1 .menu_head01,
#SC_A00_01.p01-2 .menu_head01,
#SC_A00_01.p01-3 .menu_head01,
#SC_A00_01.p01-4 .menu_head01,
#SC_A00_01.p01-5 .menu_head01,
#SC_A00_01.p02-1 .menu_head02,
#SC_A00_01.p02-2 .menu_head02,
#SC_A00_01.p02-3 .menu_head02,
#SC_A00_01.p02-4 .menu_head02,
#SC_A00_01.p02-5 .menu_head02,
#SC_A00_01.p06-1 .menu_head06,
#SC_A00_01.p06-2 .menu_head06,
#SC_A00_01.p06-3 .menu_head06,
#SC_A00_01.p06-4 .menu_head06,
#SC_A00_01.p06-5 .menu_head06,
#SC_A00_01.p07-1 .menu_head07,
#SC_A00_01.p07-2 .menu_head07,
#SC_A00_01.p07-3 .menu_head07,
#SC_A00_01.p07-4 .menu_head07,
#SC_A00_01.p07-5 .menu_head07,
#SC_A00_01.p08-1 .menu_head08,
#SC_A00_01.p08-2 .menu_head08,
#SC_A00_01.p08-3 .menu_head08,
#SC_A00_01.p08-4 .menu_head08,
#SC_A00_01.p08-5 .menu_head08,
#SC_A00_01.p09-1 .menu_head09,
#SC_A00_01.p09-2 .menu_head09,
#SC_A00_01.p09-3 .menu_head09,
#SC_A00_01.p09-4 .menu_head09,
#SC_A00_01.p09-5 .menu_head09,
#campuslife.p01-1 .menu_head01,
#campuslife.p01-2 .menu_head01,
#campuslife.p01-3 .menu_head01,
#campuslife.p01-4 .menu_head01,
#campuslife.p01-5 .menu_head01,
#campuslife.p02-1 .menu_head02,
#campuslife.p02-2 .menu_head02,
#campuslife.p02-3 .menu_head02,
#campuslife.p02-4 .menu_head02,
#campuslife.p02-5 .menu_head02,
#campuslife.p04-1 .menu_head04,
#campuslife.p04-2 .menu_head04,
#campuslife.p04-3 .menu_head04,
#campuslife.p04-4 .menu_head04,
#campuslife.p04-5 .menu_head04,
#campuslife.p05-1 .menu_head05,
#campuslife.p05-2 .menu_head05,
#campuslife.p05-3 .menu_head05,
#campuslife.p05-4 .menu_head05,
#campuslife.p05-5 .menu_head05,
#campuslife.p07-1 .menu_head07,
#campuslife.p07-2 .menu_head07,
#campuslife.p07-3 .menu_head07,
#campuslife.p07-4 .menu_head07,
#campuslife.p07-5 .menu_head07,
#SC_C01_01 .menu_head01,
#SC_C01_02 .menu_head01,
#SC_Z03_01 .menu_head02,
#SC_Z03_02 .menu_head02,
#SC_Z03_03 .menu_head02,
#SC_Z03_05 .menu_head02,
#SC_Z03_07 .menu_head02,
#SC_C02_01 .menu_head03,
#SC_C02_02 .menu_head03,
#SC_C02_03 .menu_head03,
#SC_C03_01 .menu_head04,
#SC_C03_02 .menu_head04,
#SC_C03_03 .menu_head04,
#SC_C03_04 .menu_head04,
#SC_C03_05 .menu_head04,
#SC_C03_06 .menu_head04,
#SC_C04_01 .menu_head05,
#SC_C05_01 .menu_head06,
#SC_C05_02 .menu_head06,
#SC_C05_03 .menu_head06,
#SC_C05_04 .menu_head06,
#SC_C05_17 .menu_head09,
#SC_C06_01 .menu_head07,
#SC_C09_01 .menu_head08,
#SC_C08_01 .menu_head10,
#SC_D02_01 .menu_head02,
#SC_D02_02 .menu_head02,
#SC_D02_03 .menu_head02,
#SC_D02_04 .menu_head02,
#SC_D02_05 .menu_head02,
#SC_D02_06 .menu_head02,
#SC_D02_07 .menu_head02,
#SC_D03_01 .menu_head03,
#SC_D03_03 .menu_head03,
#SC_D03_03 .menu_head03,
#SC_D03_04 .menu_head03,
#SC_D03_05 .menu_head03,
#SC_D03_06 .menu_head03,
#SC_D03_07 .menu_head03,
#SC_D05_01 .menu_head05,
#SC_D05_02 .menu_head05,
#SC_D05_03 .menu_head05,
#SC_D05_04 .menu_head05,
#SC_D05_05 .menu_head05,
#SC_D05_06 .menu_head05,
#SC_D05_07 .menu_head05,
#SC_D05_08 .menu_head05,
#SC_D05_09 .menu_head05,
#SC_D07_01 .menu_head08,
#SC_D07_04 .menu_head08,
#SC_D11_01 .menu_head07,
#SC_D11_02 .menu_head07,
#SC_D11_03 .menu_head07,
#SC_D11_04 .menu_head07,
#SC_D11_05 .menu_head07,
#SC_D14_01 .menu_head07,
#SC_D14_02 .menu_head07,
#SC_D09_01 .menu_head11,
#SC_D09_02 .menu_head11,
#SC_D10_01 .menu_head12,
#SC_D10_02 .menu_head12,
#SC_D10_03 .menu_head12,
#SC_D10_04 .menu_head12,
#SC_D10_05 .menu_head12,
#individual.p01-1 .menu_head01,
#individual.p01-2 .menu_head01,
#individual.p01-3 .menu_head01,
#individual.p01-4 .menu_head01,
#individual.p01-5 .menu_head01 {
   background-color: ${colorStorage.get(3)};
}
#SC_A00_01.p01-1 .menu_body01 a.snav01-1,
#SC_A00_01.p01-2 .menu_body01 a.snav01-2,
#SC_A00_01.p01-3 .menu_body01 a.snav01-3,
#SC_A00_01.p01-4 .menu_body01 a.snav01-4,
#SC_A00_01.p01-5 .menu_body01 a.snav01-5,
#SC_A00_01.p02-1 .menu_body02 a.snav02-1,
#SC_A00_01.p02-2 .menu_body02 a.snav02-2,
#SC_A00_01.p02-3 .menu_body02 a.snav02-3,
#SC_A00_01.p02-4 .menu_body02 a.snav02-4,
#SC_A00_01.p02-5 .menu_body02 a.snav02-5,
#SC_A00_01.p06-1 .menu_body06 a.snav06-1,
#SC_A00_01.p06-2 .menu_body06 a.snav06-2,
#SC_A00_01.p06-3 .menu_body06 a.snav06-3,
#SC_A00_01.p06-4 .menu_body06 a.snav06-4,
#SC_A00_01.p06-5 .menu_body06 a.snav06-5,
#SC_A00_01.p07-1 .menu_body07 a.snav07-1,
#SC_A00_01.p07-2 .menu_body07 a.snav07-2,
#SC_A00_01.p07-3 .menu_body07 a.snav07-3,
#SC_A00_01.p07-4 .menu_body07 a.snav07-4,
#SC_A00_01.p07-5 .menu_body07 a.snav07-5,
#SC_A00_01.p08-1 .menu_body08 a.snav08-1,
#SC_A00_01.p08-2 .menu_body08 a.snav08-2,
#SC_A00_01.p08-3 .menu_body08 a.snav08-3,
#SC_A00_01.p08-4 .menu_body08 a.snav08-4,
#SC_A00_01.p08-5 .menu_body08 a.snav08-5,
#SC_A00_01.p09-1 .menu_body09 a.snav09-1,
#SC_A00_01.p09-2 .menu_body09 a.snav09-2,
#SC_A00_01.p09-3 .menu_body09 a.snav09-3,
#SC_A00_01.p09-4 .menu_body09 a.snav09-4,
#SC_A00_01.p09-5 .menu_body09 a.snav09-5,
#campuslife.p01-1 .menu_body01 a.snav01-1,
#campuslife.p01-2 .menu_body01 a.snav01-2,
#campuslife.p01-3 .menu_body01 a.snav01-3,
#campuslife.p01-4 .menu_body01 a.snav01-4,
#campuslife.p01-5 .menu_body01 a.snav01-5,
#campuslife.p02-1 .menu_body02 a.snav02-1,
#campuslife.p02-2 .menu_body02 a.snav02-2,
#campuslife.p02-3 .menu_body02 a.snav02-3,
#campuslife.p02-4 .menu_body02 a.snav02-4,
#campuslife.p02-5 .menu_body02 a.snav02-5,
#campuslife.p04-1 .menu_body04 a.snav04-1,
#campuslife.p04-2 .menu_body04 a.snav04-2,
#campuslife.p04-3 .menu_body04 a.snav04-3,
#campuslife.p04-4 .menu_body04 a.snav04-4,
#campuslife.p04-5 .menu_body04 a.snav04-5,
#campuslife.p05-1 .menu_body05 a.snav05-1,
#campuslife.p05-2 .menu_body05 a.snav05-2,
#campuslife.p05-3 .menu_body05 a.snav05-3,
#campuslife.p05-4 .menu_body05 a.snav05-4,
#campuslife.p05-5 .menu_body05 a.snav05-5,
#campuslife.p07-1 .menu_body07 a.snav07-1,
#campuslife.p07-2 .menu_body07 a.snav07-2,
#campuslife.p07-3 .menu_body07 a.snav07-3,
#campuslife.p07-4 .menu_body07 a.snav07-4,
#campuslife.p07-5 .menu_body07 a.snav07-5,
#SC_C01_01 .menu_body01 a.snavSC_C01_01,
#SC_Z03_01 .menu_body02 a.snavSC_Z03_01,
#SC_Z03_02 .menu_body02 a.snavSC_Z03_01,
#SC_Z03_03 .menu_body02 a.snavSC_Z03_01,
#SC_Z03_05 .menu_body02 a.snavSC_Z03_05,
#SC_C02_01 .menu_body03 a.snavSC_C02_01,
#SC_C02_02 .menu_body03 a.snavSC_C02_01,
#SC_C02_03 .menu_body03 a.snavSC_C02_01,
#SC_C03_01 .menu_body04 a.snavSC_C03_01,
#SC_C03_02 .menu_body04 a.snavSC_C03_01,
#SC_C03_03 .menu_body04 a.snavSC_C03_03,
#SC_C03_04 .menu_body04 a.snavSC_C03_04,
#SC_C03_05 .menu_body04 a.snavSC_C03_01,
#SC_C03_06 .menu_body04 a.snavSC_C03_01,
#SC_C04_01 .menu_body05 a.snavSC_C04_01,
#SC_C05_01 .menu_body06 a.snavSC_C05_01,
#SC_C05_17 .menu_body09 a.snavSC_C05_17,
#SC_C06_01 .menu_body07 a.snavSC_C06_01,
#SC_C09_01 .menu_body08 a.snavSC_C09_01,
#SC_C08_01 .menu_body10 a.snavSC_C08_01,
#SC_D02_01 .menu_body02 a.snavSC_D02_01,
#SC_D02_02 .menu_body02 a.snavSC_D02_01,
#SC_D02_03 .menu_body02 a.snavSC_D02_01,
#SC_D02_04 .menu_body02 a.snavSC_D02_01,
#SC_D02_05 .menu_body02 a.snavSC_D02_01,
#SC_D02_06 .menu_body02 a.snavSC_D02_01,
#SC_D02_07 .menu_body02 a.snavSC_D02_07,
#SC_D03_01 .menu_body03 a.snavSC_D03_01,
#SC_D03_03 .menu_body03 a.snavSC_D03_02,
#SC_D03_03 .menu_body03 a.snavSC_D03_03,
#SC_D03_04 .menu_body03 a.snavSC_D03_04,
#SC_D03_05 .menu_body03 a.snavSC_D03_05,
#SC_D03_06 .menu_body03 a.snavSC_D03_06,
#SC_D03_07 .menu_body03 a.snavSC_D03_07,
#SC_D05_01 .menu_body05 a.snavSC_D05_01,
#SC_D05_02 .menu_body05 a.snavSC_D05_02,
#SC_D05_03 .menu_body05 a.snavSC_D05_03,
#SC_D05_04 .menu_body05 a.snavSC_D05_04,
#SC_D05_05 .menu_body05 a.snavSC_D05_05,
#SC_D05_06 .menu_body05 a.snavSC_D05_06,
#SC_D05_07 .menu_body05 a.snavSC_D05_07,
#SC_D05_08 .menu_body05 a.snavSC_D05_08,
#SC_D05_09 .menu_body05 a.snavSC_D05_09,
#SC_D05_09 .menu_body05 a.snavSC_D05_09,
#SC_D05_19 .menu_body05 a.snavSC_D05_19,
#SC_D05_23 .menu_body05 a.snavSC_D05_23,
#SC_D07_01 .menu_body08 a.snavSC_D07_01,
#SC_D07_04 .menu_body08 a.snavSC_D07_04,
#SC_D11_01 .menu_body07 a.snavSC_D11_01,
#SC_D11_02 .menu_body07 a.snavSC_D11_01,
#SC_D11_03 .menu_body07 a.snavSC_D11_01,
#SC_D11_04 .menu_body07 a.snavSC_D11_01,
#SC_D11_05 .menu_body07 a.snavSC_D11_01,
#SC_D14_01 .menu_body07 a.snavSC_D14_01,
#SC_D14_02 .menu_body07 a.snavSC_D14_01,
#SC_D09_01 .menu_body11 a.snavSC_D09_01,
#SC_D09_02 .menu_body11 a.snavSC_D09_01,
#SC_D10_01 .menu_body12 a.snavSC_D10_01,
#SC_D10_02 .menu_body12 a.snavSC_D10_01,
#SC_D10_03 .menu_body12 a.snavSC_D10_02,
#SC_D10_04 .menu_body12 a.snavSC_D10_02,
#SC_D10_05 .menu_body12 a.snavSC_D10_02,
#individual.p01-1 .menu_body01 a.snav01-1,
#individual.p01-2 .menu_body01 a.snav01-2,
#individual.p01-3 .menu_body01 a.snav01-3,
#individual.p01-4 .menu_body01 a.snav01-4,
#individual.p01-5 .menu_body01 a.snav01-5 {
	border-bottom:1px solid ${colorStorage.get(1)};
}
#SC_A00_01.p03 .menu_head03,
#SC_A00_01.p04 .menu_head04,
#SC_A00_01.p05 .menu_head05,
#campuslife.p03 .menu_head03,
#campuslife.p06 .menu_head06,
#SC_C01_01 .menu_head01,
#SC_Z03_01 .menu_head02,
#SC_C02_01 .menu_head03,
#SC_C03_01 .menu_head04,
#SC_C04_01 .menu_head05,
#SC_C05_01 .menu_head06,
#SC_C05_17 .menu_head09,
#SC_C06_01 .menu_head07,
#SC_C09_01 .menu_head08,
#SC_C08_01 .menu_head10,
#SC_D02_01 .menu_head02,
#SC_D02_02 .menu_head02,
#SC_D02_03 .menu_head02,
#SC_D02_04 .menu_head02,
#SC_D02_05 .menu_head02,
#SC_D02_06 .menu_head02,
#SC_D02_07 .menu_head02,
#SC_D03_01 .menu_head03,
#SC_D03_03 .menu_head03,
#SC_D03_04 .menu_head03,
#SC_D03_05 .menu_head03,
#SC_D03_06 .menu_head03,
#SC_D03_07 .menu_head03,
#SC_D05_01 .menu_head05,
#SC_D05_02 .menu_head05,
#SC_D05_03 .menu_head05,
#SC_D05_04 .menu_head05,
#SC_D05_05 .menu_head05,
#SC_D05_06 .menu_head05
#SC_D05_07 .menu_head05,
#SC_D05_08 .menu_head05,
#SC_D05_09 .menu_head05,
#SC_D05_19 .menu_head05,
#SC_D05_23 .menu_head05,
#SC_D07_01 .menu_head08,
#SC_D07_04 .menu_head08,
#SC_D11_01 .menu_head07,
#SC_D11_02 .menu_head07,
#SC_D11_03 .menu_head07,
#SC_D11_04 .menu_head07,
#SC_D11_05 .menu_head07,
#SC_D14_01 .menu_head07,
#SC_D14_02 .menu_head07,
#SC_D09_01 .menu_head11,
#SC_D09_02 .menu_head11,
#SC_D10_01 .menu_head12,
#SC_D10_02 .menu_head12,
#SC_D10_03 .menu_head12,
#SC_D10_04 .menu_head12,
#SC_D10_05 .menu_head12,
#individual.p02 .menu_head02,
#individual.p03 .menu_head03 {
   background-color: ${colorStorage.get(3)};
}
#current-id.menu_head {
   background-color: ${colorStorage.get(3)};
}
#current-id.menu_body a.snav_menu {
	border-bottom:1px solid ${colorStorage.get(1)};
}
#current-id.menu_head {
   background-color: ${colorStorage.get(3)};
}
#SC_A00_01 .right-module-inner div.intro p{
	background-color: ${colorStorage.get(1)} !important;
}
#tabIndex-nav .activeli .tabs,
#tabFile-nav .curr .tabs,
#tabs_print .tabs{

}
#datepicker_div .datepicker_control {
	background: ${colorStorage.get(1)};
}
#datepicker_div .datepicker_today {
	background: ${colorStorage.get(3)};
}
#SC_D05_14 #right-box .display th.c_group{
	background-color: ${colorStorage.get(3)};
}
#SC_C04_04 #right-box p#student span.name{
	border: 1px solid ${colorStorage.get(1)};
}
#SC_C04_04 #right-box p#student span.course{
	border-right: 1px solid ${colorStorage.get(1)};
}
#SC_C05_15 #right-box #tabs_print #tab_C05_02 .ttb_sheet table.list_tbl td.td_head,
#SC_C05_15 #right-box #tabs_print #tab_C05_04 .ttb_sheet table.list_tbl td.td_head{
	background:${colorStorage.get(1)};
}
#SC_C04_04 #right-box h2 {
	color: ${colorStorage.get(1)};
}
#SC_C04_04 #right-box h3.h3_bg {
	border-left: 5px solid ${colorStorage.get(1)};
}
#SC_S01_02 #right-box div.explanation.timetable span.icon-regist.bg_btn,
#SC_S01_02 #right-box div.explanation.timetable span.icon-clear.bg_btn,
#SC_S01_02 #right-box div.explanation.spot span.icon-regist.bg_btn,
#SC_S01_02 #right-box div.explanation.spot span.icon-clear.bg_btn,
#SC_S01_02 #right-box div.explanation.int_course span.icon-regist.bg_btn,
#SC_S01_02 #right-box div.explanation.int_course span.icon-clear.bg_btn,
#SC_S01_02 #right-box div.explanation a:hover span.icon-regist.bg_btn,
#SC_S01_02 #right-box div.explanation a:hover span.icon-clear.bg_btn,
#SC_S01_02 #right-box table.t_scedule td a:hover span.icon-regist.bg_btn,
#SC_S01_02 #right-box table.spot td a:hover span.icon-clear.bg_btn,
#SC_S01_02 #right-box table.int_course td a:hover span.icon-clear.bg_btn,
#SC_S01_02 #right-box table.t_scedule td a:hover span.icon-clear.bg_btn{
	background-color: ${colorStorage.get(2)};
}
#SC_S01_02 #right-box table.ttb_entry.tani td{
	background-color:${colorStorage.get(3)};
}`

            var newStyle = document.createElement('style');
            if(newStyle.styleSheet) {
                newStyle.styleSheet.cssText = newCss;
            } else {
                newStyle.appendChild(document.createTextNode(newCss));
            }
            document.getElementsByTagName('head')[0].appendChild(newStyle);
        }
    }

    var isColor = str => {
        var s = new Option().style;
        s.color = str;
        return s.color !== '';
    }

    // page detection
    // page ... 0: stop script, 1: deadline table
    var page = 0;
    if(['レポート一覧', '小テスト一覧', '授業アンケート一覧', '学内アンケート一覧'].includes(document.title)) {
        page = 1;
    } else if(['授業連絡一覧', '学内連絡一覧'].includes(document.title)) {
        page = 2;
    } else if(document.title == '画面カスタマイズ') {
        page = 3;
    }

    var observerConfig;
    var observer;

    switch(page) {
        case 1:
            searchListWrap = document.getElementById('searchList_wrapper');
            searchListInfo = document.getElementById('searchList_info');

            if(searchListWrap != null && searchListInfo != null) {
                // init run
                addColorNotes(deadlineColorDic);
                colorDeadlineCells();

                // add event
                observerConfig = {
                    subtree: true,
                    childList: true
                };

                observer = new MutationObserver(() => {
                    observer.disconnect();
                    addColorNotes(deadlineColorDic);
                    colorDeadlineCells();
                    observer.observe(searchListWrap, observerConfig);
                });

                observer.observe(searchListWrap, observerConfig);
            }
            break;

        case 2:
            searchListWrap = document.getElementsByClassName('dataTables_wrapper')[0];
            searchListInfo = document.getElementsByClassName('dataTables_info')[0];

            if(searchListWrap != null && searchListInfo != null) {
                // init run
                addColorNotes(unreadColorDic);
                colorUnreadCells();

                // add event
                observerConfig = {
                    subtree: true,
                    childList: true
                };

                observer = new MutationObserver(() => {
                    observer.disconnect();
                    addColorNotes(unreadColorDic);
                    colorUnreadCells();
                    observer.observe(searchListWrap, observerConfig);
                });

                observer.observe(searchListWrap, observerConfig);
            }
            break;

        case 3:
            var officialPicker = document.getElementsByClassName('color_container')[0];
            var customP = document.createElement('p');
            var customCheck = document.createElement('input');
            var customCheckSpan = document.createElement('span');
            var customSpan = [];
            var customSpanMsg = [
                '<br>色1(濃い背景色): ',
                '<br>色2(グラデーション色): ',
                '<br>色3(薄めの背景色): ',
                '<br>色4(薄い背景色): ',
                '<br>色5(暗い背景色): '
            ];
            var customPicker = [];

            customCheck.setAttribute('type', 'checkbox');
            customCheck.checked = colorStorage.isEnabled();

            for(let i = 0; i < 5; i++) {
                customSpan[i] = document.createElement('span');
                customPicker[i] = document.createElement('input');
                customSpan[i].innerHTML = customSpanMsg[i];

                customPicker[i].setAttribute('type', 'color');
                customPicker[i].setAttribute('data-id', i);
                customPicker[i].value = colorStorage.get(i);
                customPicker[i].addEventListener('change', event => {
                    colorStorage.set(event.target.getAttribute('data-id'), event.target.value);
                });
            };

            customCheck.addEventListener('change', event => {
                colorStorage.setEnable(event.target.checked);
                updateCustomColor();
            });

            customCheckSpan.innerText = 'カスタムカラーを使用する';

            customP.appendChild(customCheck);
            customP.appendChild(customCheckSpan);
            for(let i = 0; i < customSpan.length; i++) {
                customP.appendChild(customSpan[i]);
                customP.appendChild(customPicker[i]);
            }
            officialPicker.parentElement.insertBefore(customP, officialPicker);
            break;
    }

    // custom color mod
    updateCustomColor();

    // back button mod
    // save previous page link
    var aTags = document.getElementsByTagName('a');
    Object.keys(aTags).forEach(key => {
        aTags[key].addEventListener('click', event => {
            var onClickStr = event.target.closest('a').getAttribute('onclick');
            if(onClickStr.indexOf('postMenuSubmit') == 0) {
                historyStorage.push(onClickStr);
            }
        });
    });

    // hook back button
    history.pushState(null, null, null);
    window.addEventListener('popstate', event => {
        var backSpan = document.getElementsByClassName('icon-back');
        if(backSpan[0] != undefined) {
            historyStorage.pop();
            historyStorage.pop();
            backSpan[0].closest('a').click();
        } else {
            historyStorage.pop();
            var prevOnClick = historyStorage.pop();
            var aTag = document.querySelector('a[onclick="' + prevOnClick + '"]');
            console.log(historyStorage.get());
            console.log(prevOnClick);
            if(aTag != null) {
                aTag.click();
            } else {
                history.pushState(null, null, null);
            }
        }
    });

    console.log('improve_gakujo.user.js loaded');
})();
