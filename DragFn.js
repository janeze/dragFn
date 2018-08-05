; (function(global, functionName, factory) {
     typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
         typeof define === 'function' && define.amd ? define(functionName, [], factory) :
         (global[functionName] = factory());
 })(window, "DragFn", function() {
     //工具类方法
     var util = {
         console: {}, //重写window.console方法
         getDeepClone: function(param, otherParam) { //获取深度拷贝数据
             otherParam = otherParam ? otherParam : {};
             var notCloneItem = otherParam.notCloneItem || [];
             var param = param ? param : "";
             var type = toString.call(param);
             var data;
             if (type === "[object Object]") { //对象类型
                 data = {};
             } else if (type === "[object Array]") { //数组类型
                 data = [];
             } else if (type === "[object HTMLDivElement]") {
                 data = param.cloneNode(true);
                 return data;
             } else if (type === "[object NodeList]") {
                 data = [];
             } else {
                 data = param;
                 return data;
             }
             //util.console.log("before:",param);
             for (var i in param) {
                 if (param.hasOwnProperty(i)) {
                     if (notCloneItem.indexOf(i) === -1) {
                         data[i] = this.getDeepClone(param[i]);
                     }
                 }
             }
             data.__proto__ = param.__proto__;
             //util.console.log("after:",data);
             return data;
         }
     };
     (function() {
         for (var i in console) {
             if (console.hasOwnProperty(i)) {
                 util.console[i] = function() {
                     console.log.apply(window, arguments);
                 }
             }
         }
     })();
     //container只能是单一元素
     function SingleDrag(options) {
         /*******必传参数*********/
         this.container = options.container; //拖曳范围
         this.dragItemCls = options.dragItemCls; //可拖曳的元素样式
         this.isAdd=options.isAdd;//是否是从外部添加元素
         /*******选传参数*********/
         this.replaceInSameParentNode = options.replaceInSameParentNode === false ? false : true; //是否只能替换同一个父元素内的元素,默认为是
         this.replaceItemCls = options.replaceItemCls; //可替换位置的元素样式
         this.createItemCls = options.createItemCls; //可新增拖动元素的元素样式
         if (!this.replaceItemCls) {
             this.replaceItemCls = this.dragItemCls;
         }
         this.isBlankPlaceholder = options.isBlankPlaceholder === false ? false : true; //placeholder元素是否是空元素,默认为空
         this.horizontal = options.horizontal === true ? true : false; //是横向拖动还是纵向拖动，默认纵向

         this.placeholderCls = options.placeholderCls || "drag-ele-placeholder"; //即将放置拖动元素的元素样式
         this.draggingCls = options.draggingCls || "drag-ele-dragging"; //当前拖动的元素特殊样式
         this.dragoverCls = options.draoverCls || "drag-parent-over"; //经过的父元素
         /*******数据准备*********/
         this.draggingEle = ""; //当前拖动的元素
         this.placeholderEle = ""; //拖动过程，产生占位的新元素
         this.isInFistHalf = false; //placeholder元素插入前面还是后面
         this.isDoInsert=false;//对应于createItemCls使用，

         this.isDragging = false; //用于标志当前是否处于拖曳状态
         this.styleObj = {
             display: "",
             position: "",
             left: "",
             top: "",
             width: "",
             height: ""
         }; //保存拖曳前样式
         this.onBindFnName = ["dragstart", "drag", "dragenter", "dragover", "dragleave", "drop", "dragend"];
         this.onBindFn = [];
         this.indexArray = []; //排序值

         this.bind(); //初始化添加事件
         //util.console.log("********** SingleDrag init finish **********");
         return this;
     }
     SingleDrag.prototype = {
         constructor: SingleDrag,
         bind: function() {
             this.unbind();
             this.setDraggable(); //设置可拖曳元素
             //dragstart -> drag -> dragenter -> dragover ->  dragleave  -> drop -> dragend
             for (var i = 0; i < this.onBindFnName.length; i++) {
                var evtName = this.onBindFnName[i];
                this.onBindFn.push(this[evtName].call(this));
                if(this.isAdd&&["dragstart", "drag", "dragend"].indexOf(evtName)>-1){
                    this.setOuterEleEvent("addEventListener",evtName,this.onBindFn[i]);
                }else{
                    this.container.addEventListener(evtName, this.onBindFn[i], false);
                }
             }
             //当前拖曳事件绑定在父元素上，若事件触发时使用了stopPropagation，会导致外层绑定拖曳事件的父元素不能被拖曳
         },
         unbind: function() {
             for (var i = 0; i < this.onBindFnName.length; i++) {
                var evtName = this.onBindFnName[i];
                if(this.isAdd&&["dragstart", "drag", "dragend"].indexOf(evtName)>-1){
                    this.setOuterEleEvent("removeEventListener",evtName,this.onBindFn[i]);
                }else{
                    this.container.removeEventListener(evtName, this.onBindFn[i], false);
                }
             }
             this.releaseDraggable();
         },
         setOuterEleEvent:function(eventName,dragEvtName,fn){
            var eles=document.getElementsByClassName(this.dragItemCls);
            for(var i=0;i<eles.length;i++){
                var ele=eles[i];
                if(ele.getAttribute("draggable")==="true"){
                    ele[eventName](dragEvtName,fn , false);
                }
            }
            
         },
         destroy: function() {
             this.unbind();
         },
         //设置指定元素可拖曳
         setDraggable: function() {
             var srcs = this.container.querySelectorAll('.' + this.dragItemCls);
             this.indexArray = [];
             var sub = 0;
             for (var i = 0; i < srcs.length; i++) {
                var className=srcs[i].getAttribute("class");
                 if (className.indexOf(this.placeholderCls) > 0) {
                     sub += -1;
                     continue;
                 }
                 srcs[i].setAttribute("draggable", true);
                 srcs[i].setAttribute("drag-index", i + sub);
                 this.indexArray.push(i + sub);
             }
         },
         releaseDraggable: function() {
             var srcs = this.container.querySelectorAll('.' + this.dragItemCls);
             for (var i = 0; i < srcs.length; i++) {
                 srcs[i].removeAttribute("draggable");
                 srcs[i].removeAttribute("drag-index", i);
             }
             this.indexArray = [];
         },
         saveDraggingStyle: function() {
             var draggingEle = this.draggingEle;
             var style = window.getComputedStyle(draggingEle);
             for (var i in this.styleObj) {
                 this.styleObj[i] = style[i];
             }
         },
         resetDraggingStyle: function() {
             var draggingEle = this.draggingEle;
             for (var i in this.styleObj) {
                 draggingEle.style[i] = this.styleObj[i]
             }
         },
         createPlaceholder: function(draggingEle) {
             var that = this;
             var tagName = draggingEle.tagName,
                 attrs = draggingEle.attributes;
             var height = draggingEle.clientHeight,
                 width = draggingEle.clientWidth;
             //按照拖曳元素樣式屬性生成一个占位元素
             var placeholderEle = document.createElement(tagName);
             for (var i = 0; i < attrs.length; i++) {
                 var attrName = attrs[i].nodeName,
                     attrValue = attrs[i].nodeValue;
                 if (attrName === "id" || attrName === "draggable") {
                     continue;
                 }
                 placeholderEle.setAttribute(attrName, attrValue);
             }
             if (!this.isBlankPlaceholder) {
                 placeholderEle.innerHTML = draggingEle.innerHTML;
             } else {
                 placeholderEle.innerHTML = "&nbsp;";
                 placeholderEle.classList.add("is-blank-placeholder");
             }
             placeholderEle.style.height = height + "px";
             var dragEleDisplay=getComputedStyle(draggingEle).display;
             //block元素不能设置宽度，否则当被放置元素的位置宽度小于拖动元素的宽度时会有显示问题
             if(dragEleDisplay==="inline"||dragEleDisplay==="inline-block"){
                placeholderEle.style.width = width + "px";
             }
             return placeholderEle;
         },
         addPlaceholder: function(e, placeholderEle) {
             var that = this;
             placeholderEle.classList.add(that.placeholderCls);
             that.placeholderEle = null;
             that.placeholderEle = placeholderEle;
             that.isDragging = true; //设置拖曳状态为true
         },
         delPlaceholder: function() {
             var that = this;
             if (that.draggingEle.classList) {
                 that.draggingEle.classList.remove(that.draggingCls);
             }
             that.removePlaceholder();
             that.placeholderEle = null; //.remove();
             that.isDragging = false;
         },
         insertPlaceholder: function(target, isInFistHalf,isAppend) {
             var that = this;
             if(!this.placeholderEle){
                return;
             }
             if(isAppend){
                if(!target.contains(this.placeholderEle)){
                    target.append(this.placeholderEle);
                }
                return;
             }
             if (!target.parentElement) {
                 return;
             }
             if (!that.placeholderEle) {
                 // util.console.log(that.placeholderEle);
                 return;
             }
             /* if(isInFistHalf&&(target===that.draggingEle||target.previousElementSibling===that.draggingEle) ){
                 return;
              }        
              if(!isInFistHalf&&(target===that.draggingEle||target.nextElementSibling===that.draggingEle) ){
                 return;
              }  */
             var targetEle = isInFistHalf ? target : target.nextElementSibling;
             that.isInFistHalf = isInFistHalf;
             target.parentElement.insertBefore(this.placeholderEle, targetEle);
         },
         removePlaceholder: function(target) {
             var that = this;
             if (that.placeholderEle) {
                 that.placeholderEle.remove();
             }
         },
         doDrop: function(e) {
             var that = this;
             var parentNode;
             if (e.target === that.container) {
                 parentNode = e.target;
             } else {
                 parentNode = e.target.parentElement
             }
             parentNode.insertBefore(that.draggingEle, that.placeholderEle);
         },
         setIndexArray: function(e) { //获取拖曳之后的顺序数组值
             var draggingSortIndex = this.draggingEle.getAttribute("drag-index");
             draggingSortIndex = Number(draggingSortIndex);
             var draggingIndex = this.indexArray.indexOf(draggingSortIndex);
             this.indexArray.splice(draggingIndex, 1);

             var placeholderEleIndexEle = this.placeholderEle.previousElementSibling;
             var replaceSortIndex, replaceIndex;
            
             var placeholderEleIndexEleClass=(placeholderEleIndexEle&&placeholderEleIndexEle.getAttribute("class")||"").split(/\s+/g);
             var sureInFistHalf=!placeholderEleIndexEle||placeholderEleIndexEleClass.indexOf(this.replaceItemCls)===-1;
            
             if (this.isInFistHalf&&sureInFistHalf) {
                 this.indexArray.unshift(draggingSortIndex);
              } else {
                 replaceSortIndex = placeholderEleIndexEle.getAttribute("drag-index");
                 replaceSortIndex = Number(replaceSortIndex);
                 replaceIndex = this.indexArray.indexOf(replaceSortIndex);
                 this.indexArray.splice(replaceIndex, 1, replaceSortIndex, draggingSortIndex);
             }
         },
         isInDraggableChildren: function(e) {
             var path = e.path || [];
             var index = -1;
             var len = path.length - 2; //document和window元素不需要遍历   
             for (var i = 0; i < len; i++) {
                 if (path[i].getAttribute("draggable") === "true") {
                     index = i;
                     break;
                 }
             }
             return index;
         },
         getTarget: function(e) {
             var index = this.isInDraggableChildren(e);
             var target;
             if (index === 0) {
                 target = e.target;
             } else if (index > -1) {
                 target = e.path[index];
             } else {
                 target = e.target;
             }
             return target;
         },
         isDropAllowed: function(target) {
            var targetClassName=target.getAttribute("class");
             if (targetClassName.indexOf(this.replaceItemCls) < 0) { //可替换位置的元素
                 return false;
             }
             if (this.replaceInSameParentNode && this.draggingEle.parentElement !== target.parentElement) { //是否只能替换同一个父元素内的元素
                 return false;
             }
             if(!this.draggingEle||this.draggingEle.getAttribute("class").indexOf(this.dragItemCls)<0){
                return false;
             }
             return true;
         },
         isInCreateItem:function(target){
            var className=target.getAttribute("class");
            if(className===null){
                className="";
            }
            var createItemCls=this.createItemCls||"";
            if(typeof createItemCls==="string"){
                createItemCls=createItemCls.split(",");
            }
            if(createItemCls.length===0){
                return false;
            }
            var len=createItemCls.length,cango;
            for(var i=0;i<len;i++){
                if(className.indexOf(createItemCls[i])!==-1){//可新增元素的元素样式位置
                    cango=true;
                    break;
                }
            }
            if(!cango){
                return false;
            }else{
                return true;
            }
         },
         isAddEleAllowed:function(target){
                var className=target.getAttribute("class");
                if(className===null){
                    className="";
                }
                //可新增元素的元素样式位置
                if(this.createItemCls&&this.createItemCls.length>1){
                    if(!this.isInCreateItem(target)){
                        return false;
                    }
                }else if(className.indexOf(this.createItemCls)<0){
                    return false;
                }
               
                var draggingEle=this.draggingEle;
                if(!draggingEle||draggingEle.getAttribute("class").indexOf(this.dragItemCls)<0){
                    return false;
                }

                var children=target.children;
                if(children.length>0){
                    return false;
                }
                return true;
         },
         isMouseInFirstHalf: function(e) {
             var horizontal = this.horizontal, //是否横向
                 relativeToParent = true; //暂时不需要
             var targetNode = e.target;
             var mousePointer = horizontal ? (e.offsetX) : (e.offsetY);
             var targetSize = horizontal ? targetNode.offsetWidth : targetNode.offsetHeight;
             var halfPosition = targetSize / 2;
             return mousePointer < halfPosition;
         },
         dragstart: function() {
             var that = this;
             return function(e) { /*event.dataTransfer的大部分设置均在这里配置*/
                 // util.console.log("%cdragStart:", "color:red", e);
                 // FF下拖拽时，默认不会生成一个被拖拽元素的阴影并跟随鼠标移动
                 // 需通过e.dataTransfer.setData来启动该效果
                 e.dataTransfer.setData('text', e.target.innerHTML); //解决ff的兼容问题
                 e.dataTransfer.effectAllowed = "move";
                 var draggingEle = e.target; //當前元素
                 var placeholderEle = that.createPlaceholder(draggingEle); //placeholder元素
                 that.addPlaceholder(e, placeholderEle);
                 //記錄當前拖曳元素
                 that.draggingEle = draggingEle;
                 that.saveDraggingStyle();
                 that.draggingEle.classList.add(that.draggingCls);
                 if(!that.isAdd){
                     setTimeout(function() {
                         that.draggingEle.style.display = "none";
                     }, 0);
                 }
                 //  e.stopPropagation();
             };
         },
         drag: function() {
             var that = this;
             return function(e) {
                 //util.console.log("%cdrag:", "color:blue", e.target);
             };
         },
         dragenter: function() {
             var that = this;
             return function(e) {
                 //util.console.log("%cdragEnter:", "color:orange", e.target);
                 //可以在这里设置dropEffect的值，事件的默认行为是将dropEffect设置为none
                 //默认行为是不允许被拖拽元素在其他元素上释放或放置（即无法触发 drop 事件），需要通过 event.preventDefault() 来阻止默认行为才能触发后续的 drop 事件
                 e.preventDefault();
             };
         },
         dragover: function() {
             var that = this;
             return function(e) {
                 //util.console.log("%cdragOver:", "color:blue", e.target);
                 //可以在这里设置dropEffect的值，事件的默认行为是将dropEffect设置为none
                 //默认行为是不允许被拖拽元素在其他元素上释放或放置（即无法触发 drop 事件），需要通过 event.preventDefault() 来阻止默认行为才能触发后续的 drop 事件
                 //场景一、当前位置元素可以插入placeholder
                 var isInsertEle=that.isAddEleAllowed(e.target);
                 if(that.isInCreateItem(e.target)){
                     if(isInsertEle){
                        that.isDoInsert=true;
                        that.removePlaceholder();
                        that.insertPlaceholder(e.target, false,true);
                        if (that.container.getAttribute("class").indexOf(that.dragoverCls) < 0) {
                            var className= that.container.getAttribute("class").trim() + " " + that.dragoverCls;
                            that.container.setAttribute("class",className);
                         }
                        e.preventDefault();
                        return;
                     }
                 }
                 //场景二、当前位置元素是插入的placeholder
                 if (e.target == that.placeholderEle) {
                    e.preventDefault();
                    return;
                 }
                 //场景三、当前位置元素不可插入也不可替换元素
                var target=that.getTarget(e);
                if(!target){
                    return;
                }
                //场景四、当前位置元素不可插入也不可替换元素
                 if (!that.isDropAllowed(target)) {
                     e.preventDefault();
                     // e.stopPropagation();
                     return;
                 }
                 //场景五、当前位置可替换元素
                 var isInFistHalf = that.isMouseInFirstHalf(e);
                 if (target !== that.placeholderEle) {
                    that.isDoInsert=false;
                     that.removePlaceholder();
                     that.insertPlaceholder(target, isInFistHalf);
                     if ((that.container.getAttribute("class")||"").indexOf(that.dragoverCls) < 0) {
                         var className = (that.container.getAttribute("class")||"").trim() + " " + that.dragoverCls;
                        that.container.setAttribute("class",className);
                     }
                 }
                 
                 e.preventDefault();
                 // e.stopPropagation();
             };
         },
         dragleave: function() {
             var that = this;
             return function(e) {
                 //util.console.log("%cdragLeave:", "color:green", e.target);
                 if (!that.placeholderEle) return;
                 if (e.target === that.placeholderEle) {
                     return;
                 }
                 var className = (that.container.getAttribute("class")||"").replace(that.dragoverCls, "").trim();
                 that.container.setAttribute("class",className);
                 setTimeout(function() {
                     if (that.container.getAttribute("class").indexOf(that.dragoverCls) < 0) {
                         // that.removePlaceholder();
                     }
                 }, 100);
             };
         },
         drop: function() {
             var that = this;
             return function(e) {
                 //util.console.log("%cdrop:", "color:fuchsia", e.target);
                 if (that.placeholderEle && that.placeholderEle.parentElement) {
                     if(!that.isDoInsert){
                        that.setIndexArray(e);
                     }
                     that.doDrop(e);
                     that.afterDrop(e);
                 }
                 // e.stopPropagation();
             };
         },
         dragend: function() {
             var that = this;
             return function(e) {
                 //util.console.log("%cdragend:", "color:red", e.target);
                 that.delPlaceholder();
                 //  that.resetDraggingStyle();
                 //  e.stopPropagation();
                 setTimeout(function() {
                     if (that.draggingEle.style) {
                         that.draggingEle.style.display = that.styleObj.display;
                     }
                 }, 0);
                 that.afterDrag(e);
             }
         },
         afterDrag: function(e) { //待实例对象重写
         },
         afterDrop: function(e) { //待实例对象重写
         }
     };
     //container可是数组
     function DragFn(options) {
         var DragArr = [];
         var contains = options.container;
         //遍历参数
         for(var o in options){
            if(typeof options[o]==="function"){//将方法事件传入
                this[o]=options[o];
            }
         }
         if (!contains) {
             return;
         }
         var eleReg = /^\[object HTML.*Element\]$/;
         if (eleReg.test(toString.call(contains))) { //單個節點
             DragArr.push(SingleDrag.call(this, options));
         } else if (toString.call(contains) === "[object NodeList]") { //多個節點
             for (var i = 0; i < contains.length; i++) {
                 var container = contains[i];
                 options.container = container;
                 DragArr.push(SingleDrag.call(this, options));
             }
         }
         this.DragArr = DragArr;
         return this;
     }
     (function() {
         var temp = function() {};
         temp.prototype = SingleDrag.prototype;
         DragFn.prototype = new temp();
         //  DragFn.prototype.constructor=DragFn;
     })();
     DragFn.prototype.destroy = function() {
         var DragArr = this.DragArr;
         for (var i = 0; i < DragArr.length; i++) {
             DragArr[i].__proto__.__proto__.destroy.apply(this, arguments);
         }
     }
     return DragFn;
 });
