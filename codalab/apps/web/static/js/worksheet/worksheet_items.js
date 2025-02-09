/** @jsx React.DOM */

/*
All of the editing functionality here is deprecated, since it's too complicated to maintain
and to keep in sync with the markdown.  We are switching to pure markdown editing.
*/

var WorksheetItemList = React.createClass({
    getInitialState: function(){
        return {
            focusIndex: -1,
            editingIndex: -1,
            checkboxEnabled: true,
            worksheet: {
                last_item_id: 0,
                name: '',
                owner: null,
                owner_id: 0,
                uuid: 0,
                items: [],
                edit_permission: false,
                raw: []
            }
        };
    },
    throttledScrollToItem: undefined, // for use later
    componentDidMount: function() {
        this.props.refreshWorksheet();
        // Set up the debounced version of the save method here so we can call it later
        this.slowSave = _.debounce(this.props.saveAndUpdateWorksheet, 1000);
    },
    componentDidUpdate: function(){
        if(!this.state.worksheet.items.length){
            $('.empty-worksheet').fadeIn('fast');
        }
        if(this.state.editMode){
            $('#raw-textarea').trigger('focus');
        }
    },
    capture_keys: function(){
        // console.log("bind keys for the WorksheetItemList");
        var fIndex = this.state.focusIndex;
        var eIndex = this.state.editingIndex;
        var focusedItem = this.refs['item' + fIndex];
        if(!this.props.active){ // if we are not the active component dont bind keys
            return;
        }

        Mousetrap.bind(['up', 'k'], function(e){
            if(fIndex <= 0){
                // if we're already at the top of the worksheet, we can't go higher
                fIndex = -1;
            }else {
                fIndex = Math.max(this.state.focusIndex - 1, 0);
            }
            this.setFocus(fIndex, e, null, 'up');
        }.bind(this), 'keydown');

        Mousetrap.bind(['ctrl+up', 'meta+up', 'ctrl+k', 'meta+k'], function(e){
            if(this.props.canEdit){
                this.moveItem(-1);
            }
        }.bind(this), 'keydown');
        //jump to the top - 1 G
        Mousetrap.bind(['1 shift+g'], function(e){
            $('body').stop(true).animate({scrollTop: 0}, 50);
            this.setFocus(0, e, null, null);
        }.bind(this), 'keydown');

        ////

        Mousetrap.bind(['down', 'j'], function(e){
            // Don't allow moving past the last item. Because the number of ws-item divs might
            // not be the same as the number of item objects because of editing/inserting/whatever,
            // count the actual divs instead
            fIndex = Math.min(this.state.focusIndex + 1, $('#worksheet_content .ws-item').length - 1);
            this.setFocus(fIndex, e, null, 'down');
            // console.log('moving down');
        }.bind(this), 'keydown');

        Mousetrap.bind(['ctrl+down', 'meta+down', 'ctrl+j', 'meta+j'], function(e){
            if(this.props.canEdit){
                this.moveItem(1);
            }
        }.bind(this), 'keydown');

        // jump to the bottom - G
        Mousetrap.bind(['shift+g'], function(e){
            fIndex = $('#worksheet_content .ws-item').length - 1;
            this.setFocus(fIndex, e, null, true);
            $("html, body").animate({ scrollTop: $(document).height() }, "fast");
        }.bind(this), 'keydown');

        ////
        // TODO TODO TODO TODO TODO MOVE TO MARKDOWN
        Mousetrap.bind(['e'], function(e){
            if(this.props.canEdit){
                this.setState({editingIndex: fIndex});
                this.props.toggleEditingText(true);
                return false;
            }
        }.bind(this), 'keydown');

        //check the box of a worksheet item - x
        Mousetrap.bind(['x'], function(e){
            if(focusedItem && this.props.canEdit){
                focusedItem.setState({checked: !focusedItem.state.checked});
                return false;
            }
        }.bind(this), 'keydown');

        //detach an item in this worksheet - d
        Mousetrap.bind(['d'], function(e){
            if(this.props.canEdit){
                this.detachChecked();
                return false;
            }
        }.bind(this), 'keydown');


        //insert an item either below or above - o O
        Mousetrap.bind(['o'], function(e){
            if(this.props.canEdit){
                this.insertItem(1);
                return false;
            }
        }.bind(this), 'keydown');

        Mousetrap.bind(['shift+o'], function(e){
            if(this.props.canEdit){
                this.insertItem(0);
                return false;
            }
        }.bind(this), 'keydown');


        if(focusedItem && focusedItem.hasOwnProperty('capture_keys')){
            // pass the event along to the element
            focusedItem.capture_keys();
        }
    },
    scrollToItem: function(index, event){
        // scroll the window to keep the focused element in view if needed
        var __innerScrollToItem = function(index, event){
            var container = $(".ws-container")
            var navbarHeight = parseInt($('body').css('padding-top'));
            var viewportHeight = Math.max($(".ws-container").innerHeight() || 0);

            var item = this.refs['item' + index];
            var node = item.getDOMNode();
            var nodePos = node.getBoundingClientRect(); // get all measurements for node rel to current viewport
             // where is the top of the elm on the page and does it fit in the the upper forth of the page
            var scrollTo = $(".ws-container").scrollTop() + nodePos.top - navbarHeight - (viewportHeight/4);
            // how far node top is from top of viewport
            var distanceFromTopViewPort = nodePos.top - navbarHeight;
            // TODO if moving up aka K we should focus on the bottom rather then the top, maybe? only for large elements?
            // the elm is down the page and we should scrol to put it more in focus
            // console.log('scrolling');
            if(distanceFromTopViewPort > viewportHeight/3){
                $(".ws-container").stop(true).animate({scrollTop: scrollTo}, 45);
                return;
            }
            // if the elment is not in the viewport (way up top), just scroll
            if(distanceFromTopViewPort < 0){
                $(".ws-container").stop(true).animate({scrollTop: scrollTo}, 45);
                return;
            }
        }; // end of __innerScrollToItem

        //throttle it becasue of keydown and holding keys
        if(this.throttledScrollToItem === undefined){ //create if we dont already have it.
            this.throttledScrollToItem = _.throttle(__innerScrollToItem, 75).bind(this);
        }
        this.throttledScrollToItem(index, event);
    },
    resetFocusIndex: function(){
        this.setState({focusIndex: -1});
    },
    saveItem: function(index, interpreted){ // aka handleSave
        if(typeof index !== 'undefined' && typeof interpreted !== 'undefined'){
            var item = ws_obj.getState().items[index];
            var mode = item.state.mode;
            var newItem = this.refs['item' + index].state.new_item;
            // because we need to distinguish between items that have just been inserted and items
            // that were edited, we have a 'new_item' flag on markdown items' state
            if(newItem){
                // if it's a new item, it hasn't been added to the raw yet, so do that.
                ws_obj.insertRawItem(index, interpreted);
            }else {
                ws_obj.state.items[index].state.interpreted = interpreted;
                ws_obj.setItem(index, ws_obj.state.items[index]);
            }
            // we duplicate this here so the edits show up right away, instead of after the save + update
            item.state.interpreted = interpreted;
            if(mode==='markup'){
                // we may have added contiguous markdown bundles, so we need to reconsolidate
                var unconsolidated = ws_obj.getState();
                var consolidated = ws_obj.consolidateMarkdownBundles(unconsolidated.items);
                ws_obj.state.items = consolidated;
            }
            this.setState({
                editingIndex: -1,
                worksheet: ws_obj.getState()
            });
            this.props.toggleEditingText(false);
            //reset the 'new_item' flag to false so it doesn't get added again if we edit and save it later
            this.refs['item' + index].setState({new_item:false});
        }
        this.props.saveAndUpdateWorksheet();
    },
    unInsert: function(){
        // this gets called when we insert an item then esc without saving it
        // set the item to undefined so it gets cleaned up
        ws_obj.setItem(this.state.focusIndex, undefined);
        var newFocusIndex = this.state.focusIndex;
        // Handle the special case of a bundle being added at the very end of the worksheet,
        // then cancelled (hit esc without saving). In this case we need to set the focus index
        // back one, to the last item in the worksheet. Otherwise the ghost of the cancelled item
        // retains focus and throws off the indices if insert is called again
        if(this.state.focusIndex === this.state.worksheet.items.length - 1){
            newFocusIndex--;
        }
        this.setState({
            worksheet: ws_obj.getState(),
            focusIndex: newFocusIndex
        });
    },
    detachChecked: function(){
        var reactItems = this.refs;
        var worksheet = this.state.worksheet;
        var item_indexes =[];
        for(var k in reactItems){
            if(reactItems[k].state.checked){
                // we know the key of the item is the same as the index. We set it.
                // see WorksheetItemFactory. This will change but always match.
                var index = reactItems[k].props.index;
                item_indexes.push(index)
                // when called gets a edited flag, when you getState
            }
        }
        var confirm_string = item_indexes.length === 1 ? 'this item?' : item_indexes.length + ' items?'
        if(item_indexes.length && window.confirm("Do you really want to detach " + confirm_string)){
            // only proceed if it turns out that one or more items were actually checked
            ws_obj.deleteItems(item_indexes)
            // does a clean before setting it's state and updating
            this.props.saveAndUpdateWorksheet();
            this.unCheckItems();
        }
    },
    unCheckItems: function(){
        var reactItems = this.refs;
        for(var k in reactItems){
            reactItems[k].setState({checked: false});
        }
    },
    insertItem: function(pos){
        var newIndex = this.state.focusIndex + pos;
        var newItem = new WorksheetItem('', {}, 'markup');
        ws_obj.insertItem(newIndex, newItem);
        this.setState({
            worksheet: ws_obj.getState(),
            focusIndex: newIndex,
            editingIndex: newIndex
        });
        this.props.toggleEditingText(true);
        // Set the new_item flag so we know to add it to raw on save
        this.refs['item' + newIndex].setState({new_item: true});
        // we are inserting the item and switching to edit mode. The markup interface will handle
        // editing the raw/items if need and do the call back to save.
    },
    moveItem: function(delta){
        // delta is currently either +1 or -1
        // but in theory an item could be moved by any number of steps
        var oldIndex = this.state.focusIndex;
        var newIndex = oldIndex + delta;
        if(0 <= newIndex && newIndex < this.state.worksheet.items.length){
            ws_obj.moveItem(oldIndex, newIndex);
            this.setState({focusIndex: newIndex, worksheet: ws_obj.getState(),}, this.scrollToItem(newIndex));
            // wrap save in a debouce to slow it down
            // will happen after they stop moving items
            this.slowSave();

        }else {
            return false;
        }
    },
    setFocus: function(index, event, last_sub_el, direction, scroll){
        if(typeof(scroll) === 'undefined'){
            scroll = true;
        }
        // index : what item index we want to focus on
        // event : the JS click event or keyboard event
        // last_sub_el: True/False force a focus on the last sub element
        if(index < this.state.worksheet.items.length){
            this.setState({focusIndex: index});
            //pass back up to workshet interface so the app knows which item is slected
            this.props.updateWorksheetFocusIndex(index)
            if(index >= 0){
                var mode = ws_obj.state.items[index].state.mode;
                var react_el = this.refs['item'+index]
                if(mode === 'table'){
                    this.toggleCheckboxEnable(false);
                    if(direction == 'up'){
                        last_sub_el = true;
                    }
                }else {
                    this.toggleCheckboxEnable(true);
                }
                if(react_el && last_sub_el){ //we have a react item and wish to force last sub item (usefulll for tables)
                    if(react_el.hasOwnProperty('focusOnLast')){
                        react_el.focusOnLast(event);
                    }
                }
                if(typeof(event) !== 'undefined'){
                    // var throttledScrollToItem = _.throttle(this.scrollToItem, 1000).bind(this);
                    // console.log("again?")
                    // throttledScrollToItem(index, event);
                    if(scroll){
                        this.scrollToItem(index, event)
                    }
                }
            }// end of if(index >= 0){
        }else {
            return false;
        }
    },
    toggleCheckboxEnable: function(enabled){
        this.setState({checkboxEnabled: enabled});
    },
    render: function(){
        this.capture_keys(); //each item capture keys are handled dynamically after this call
        // shortcut naming
        var canEdit         = this.props.canEdit;
        var updateWSFI      = this.props.updateWorksheetSubFocusIndex; //when on a complex item type (table) understand which bundle user has selectd
        var checkboxEnabled = this.state.checkboxEnabled;
        var editingIndex    = this.state.editingIndex;
        var focusIndex      = this.state.focusIndex;
        var handleSave      = this.saveItem;
        var setFocus        = this.setFocus;


        var worksheet_items = [];
        // console.log(ws_obj.state.items);

        var items_display = <p className="empty-worksheet">This worksheet is empty</p>
        if(ws_obj.state.items.length > 0) {
            ws_obj.state.items.forEach(function(item, i){
                var ref = 'item' + i;
                var focused = i === focusIndex;
                var editing = i === editingIndex;
                //create the item of the correct type and add it to the list.
                worksheet_items.push(
                        WorksheetItemFactory(item, ref, focused, editing, i, handleSave, setFocus, canEdit, checkboxEnabled, updateWSFI)
                    )
            });
            items_display = worksheet_items
        }

        return <div id="worksheet_items">{items_display}</div>
    }
});











var WorksheetItemFactory = function(item, ref, focused, editing, i, handleSave, setFocus, canEdit, checkboxEnabled, updateWorksheetSubFocusIndex){
    switch (item.state.mode) {
        case 'markup':
            return <MarkdownBundle
                        key={i}
                        index={i}
                        item={item}
                        ref={ref}
                        focused={focused}
                        editing={editing}
                        canEdit={canEdit}
                        setFocus={setFocus}
                        checkboxEnabled={checkboxEnabled}
                        updateWorksheetSubFocusIndex={updateWorksheetSubFocusIndex}

                        handleSave={handleSave}
                />
            break;
        case 'inline':
            return <InlineBundle
                        key={i}
                        index={i}
                        item={item}
                        ref={ref}
                        focused={focused}
                        editing={editing}
                        canEdit={canEdit}
                        setFocus={setFocus}
                        checkboxEnabled={checkboxEnabled}
                        updateWorksheetSubFocusIndex={updateWorksheetSubFocusIndex}
                />
            break;
        case 'table':
            return <TableBundle
                        key={'tb'+i}
                        index={i}
                        item={item}
                        ref={ref}
                        focused={focused}
                        editing={editing}
                        canEdit={canEdit}
                        setFocus={setFocus}
                        checkboxEnabled={checkboxEnabled}
                        updateWorksheetSubFocusIndex={updateWorksheetSubFocusIndex}

                        handleSave={handleSave}
                    />
            break;
        case 'contents':
            return <ContentsBundle
                        key={i}
                        index={i}
                        item={item}
                        ref={ref}
                        focused={focused}
                        editing={editing}
                        canEdit={canEdit}
                        setFocus={setFocus}
                        checkboxEnabled={checkboxEnabled}
                        updateWorksheetSubFocusIndex={updateWorksheetSubFocusIndex}
                />
            break;
        case 'html':
            return <HTMLBundle
                        key={i}
                        index={i}
                        item={item}
                        ref={ref}
                        focused={focused}
                        editing={editing}
                        canEdit={canEdit}
                        setFocus={setFocus}
                        checkboxEnabled={checkboxEnabled}
                        updateWorksheetSubFocusIndex={updateWorksheetSubFocusIndex}
                />
            break;
        case 'record':
            return <RecordBundle
                        key={i}
                        index={i}
                        item={item}
                        ref={ref}
                        focused={focused}
                        editing={editing}
                        canEdit={canEdit}
                        setFocus={setFocus}
                        checkboxEnabled={checkboxEnabled}
                        updateWorksheetSubFocusIndex={updateWorksheetSubFocusIndex}
                />
            break;
        case 'image':
            return <ImageBundle
                        key={i}
                        index={i}
                        item={item}
                        ref={ref}
                        focused={focused}
                        editing={editing}
                        canEdit={canEdit}
                        setFocus={setFocus}
                        checkboxEnabled={checkboxEnabled}
                        updateWorksheetSubFocusIndex={updateWorksheetSubFocusIndex}
                />
            break;
        case 'worksheet':
            return <WorksheetBundle
                        key={i}
                        index={i}
                        item={item}
                        ref={ref}
                        focused={focused}
                        editing={editing}
                        canEdit={canEdit}
                        setFocus={setFocus}
                        checkboxEnabled={checkboxEnabled}
                        updateWorksheetSubFocusIndex={updateWorksheetSubFocusIndex}
                />
            break;
        case 'search':
            return <SearchBundle
                        key={i}
                        index={i}
                        item={item}
                        ref={ref}
                        focused={focused}
                        editing={editing}
                        canEdit={canEdit}
                        setFocus={setFocus}
                        checkboxEnabled={checkboxEnabled}
                />
            break;
        default:  // something new or something we dont yet handle
            return (
                <div>
                    <strong>
                        {item.state.mode}
                    </strong>
                </div>
            )
    }
}


