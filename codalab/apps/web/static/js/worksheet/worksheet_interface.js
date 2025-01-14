/** @jsx React.DOM */

var keyMap = {
    13: "enter",
    27: "esc",
    69: "e",
    70: "f",
    38: "up",
    40: "down",
    65: "a",
    66: "b",
    68: "d",
    73: "i",
    74: "j",
    75: "k",
    79: "o",
    88: "x",
    191: "fslash"
};

var Worksheet = React.createClass({
    // master parent that controls the page
    getInitialState: function(){
        return {
            activeComponent: 'list',
            editMode: false,
            showActionBar: true,
            editingText: false,
            // Which worksheet items to be on
            focusIndex: -1,
            subFocusIndex: 0,  // For tables
        };
    },
    _setfocusIndex: function(index){
        this.setState({focusIndex: index});
    },
    _setWorksheetSubFocusIndex: function(index){
        this.setState({subFocusIndex: index});
    },
    componentDidMount: function() {
        this.bindEvents();
        $('body').addClass('ws-interface');
    },
    componentWillUnmount: function(){
        this.unbindEvents();
    },
    bindEvents: function(){
    },
    unbindEvents: function(){
        // window.removeEventListener('keydown');
    },
    canEdit: function(){
        return ws_obj.getState().edit_permission;
    },
    viewMode: function(){
        this.toggleEditMode(false);
    },
    editMode: function(){
        this.toggleEditMode(true);
    },
    handleActionBarFocus: function(event){
        this.setState({activeComponent:'action'});
        // just scroll to the top of the page.
        // Add the stop() to keep animation events from building up in the queue
        // See also scrollTo* methods
        $('#worksheet_panel').addClass('actionbar-focus');
        $('#command_line').data('resizing', null);
        $('body').stop(true).animate({scrollTop: 0}, 250);
    },
    handleActionBarBlur: function(event){
        // explicitly close term because we're leaving the action bar
        // $('#command_line').terminal().focus(false);
        this.setState({activeComponent:'list'});
        $('#command_line').data('resizing', null);
        $('#worksheet_panel').removeClass('actionbar-focus').removeAttr('style');
        $('#ws_search').removeAttr('style');
    },
    capture_keys: function(){
        // console.log("-------------------  capture_keys  -------------------");
        Mousetrap.reset();// reset, since we will call children, lets start fresh.

        var activeComponent = this.refs[this.state.activeComponent];
        if (this.state.activeComponent == 'action') {
            // no need for other keys, we have the action bar focused
            return;
        }

        // No keyboard shortcuts are active in edit mode
        if (this.state.editMode) {
            Mousetrap.bind(['ctrl+enter', "meta+enter"], function(e) {
                this.toggleEditMode();
            }.bind(this));
            return;
        }

        Mousetrap.bind(['?'], function(e){
            $('#glossaryModal').modal('show');
        });

        Mousetrap.bind(['esc'], function(e){
            if($('#glossaryModal').hasClass('in')){
                $('#glossaryModal').modal('hide');
            }
        });

        Mousetrap.bind(['shift+r',], function(e){
            this.refreshWorksheet();
            return false;
        }.bind(this));

        // Show/hide web terminal
        Mousetrap.bind(['shift+c'], function(e){
            this.toggleActionBar();
        }.bind(this));

        // Focus on web terminal (action bar)
        Mousetrap.bind(['c'], function(e){
            this.showActionBar();
            this.setState({activeComponent: 'action'});
            $('#command_line').terminal().focus();
        }.bind(this));

        // Toggle edit mode
        Mousetrap.bind(['e'], function(e){
            this.toggleEditMode();
            return false;
        }.bind(this));
    },
    toggleEditMode: function(editMode) {
        if (typeof(editMode) == 'undefined')
          editMode = !this.state.editMode;  // Toggle by default

        if (!editMode) {
          // Going out of raw mode - save the worksheet.
          if (this.canEdit()) {
            // TODO: grab val the react way
            ws_obj.state.raw = $("#raw-textarea").val().split('\n');
            this.setState({editMode: editMode});  // Needs to be after getting the raw contents
            this.saveAndUpdateWorksheet(true);
          } else {
            // Not allowed to save worksheet.
          }
        } else {
          // Go into edit mode.
          this.setState({editMode: editMode});  // Needs to be before focusing
          this.setState({activeComponent: 'textarea'});
          // TODO: set cursor intelligently rather than just leaving it at the beginning.
          $("#raw-textarea").focus();
        }
    },
    toggleActionBar: function(){
        this.setState({showActionBar:!this.state.showActionBar});
    },
    showActionBar: function(){
        this.setState({showActionBar:true});
    },
    hideActionBar: function(){
        this.setState({showActionBar:false});
    },
    refreshWorksheet: function(){
        $('#update_progress').show();
        this.setState({updating:true});
        ws_obj.fetch({
            success: function(data){
                // console.log("fetch_and_update success");
                // console.log("%c--------------------------------------------------------------", "color: Green; font-size:15px;");
                if(this.isMounted()){
                    this.refs.list.setState({worksheet: ws_obj.getState()});
                }
                $('#update_progress, #worksheet-message').hide();
                $('#worksheet_content').show();
                if(ws_obj.getState().items.length === 0){
                    this.refs.list.resetFocusIndex();
                }
                this.setState({updating:false});
            }.bind(this),
            error: function(xhr, status, err) {
                console.error(ws_obj.url, status, err);
                this.setState({updating:false});

                if (xhr.status == 404) {
                    $("#worksheet-message").html("Worksheet was not found.").addClass('alert-danger alert');
                } else {
                    var error_msg = xhr.responseJSON.error
                    if(error_msg){ err = error_msg }
                    $("#worksheet-message").html("An error occurred: <code>'" + status + "' " + err + " (" + xhr.status + ")</code>. Please try refreshing the page.").addClass('alert-danger alert');
                }
                $('#update_progress').hide();
                $('#worksheet_container').hide();
            }.bind(this)
        });
    },
    saveAndUpdateWorksheet: function(from_raw){
        $("#worksheet-message").hide();
        // does a save and a update
        this.setState({updating:true});
        ws_obj.saveWorksheet({
            success: function(data){
                this.setState({updating:false});
                if('error' in data){ // TEMP REMOVE FDC
                    $('#update_progress').hide();
                    $('#save_error').show();
                    $("#worksheet-message").html("A save error occurred: <em>" + data.error + "</em> <br /> Please try refreshing the page or saving again").addClass('alert-danger alert').show();
                    if(from_raw){
                        this.toggleEditMode(true);
                    }
                }else{
                    this.refreshWorksheet();
                }
                // debugger;
            }.bind(this),
            error: function(xhr, status, err) {
                console.error(xhr, status, err);
                this.setState({updating:false});
                if (xhr.status == 404) {
                    $("#worksheet-message").html("Worksheet was not found.").addClass('alert-danger alert').show();
                } else if (xhr.status == 401){
                    $("#worksheet-message").html("You do not have permission to edit this worksheet.").addClass('alert-danger alert').show();
                } else {
                    $("#worksheet-message").html("A save error occurred: <em>" + err.string() + "</em> <br /> Please try refreshing the page or saving again.").addClass('alert-danger alert').show();
                }
            }
        });
    },
    render: function(){
        this.capture_keys();
        var rawWorksheet = ws_obj.getRaw();
        var editPermission = ws_obj.getState().edit_permission;
        var canEdit = this.canEdit() && this.state.editMode;

        var searchHidden = !editPermission && !this.state.showActionBar;
        var checkboxEnabled = this.state.checkboxEnabled;

        var serachClassName     = searchHidden ? 'search-hidden' : '';
        var editableClassName   = canEdit ? 'editable' : '';
        var viewClass           = !canEdit && !this.state.editMode ? 'active' : '';
        var editClass           = canEdit && !this.state.editMode ? 'active' : '';
        var rawClass            = this.state.editMode ? 'active' : '';
        /*var edit_btn = '';
        if(editPermission) {
            edit_btn = <button className={editClass} onClick={this.editMode}>Edit</button>
        }*/
        var sourceStr = editPermission ? 'Edit source' : 'View source';
        var editFeatures = (
            <div className="edit-features">
                <label>Mode:</label>
                <div className="btn-group">
                    <button className={viewClass} onClick={this.viewMode}>View</button>
                    <button className={rawClass} onClick={this.editMode}>{sourceStr}</button>
                </div>
            </div>
        );

        var permission_str = ws_obj.state.permission_str + ' [';
        ws_obj.state.group_permissions.forEach(function(perm) {
            permission_str = permission_str + " " + perm.group_name + "(" + perm.permission_str + ")";
        });
        permission_str += ' ]';
        if (ws_obj.state.items.length) {
            // Non-empty worksheet
        } else {
            $('.empty-worksheet').fadeIn();
        }

        // http://facebook.github.io/react/docs/forms.html#why-textarea-value
        var raw_display = <div>
            Press ctrl-enter to save.
            <textarea
                id="raw-textarea"
                className="form-control mousetrap"
                defaultValue={rawWorksheet.content}
                rows={30}
                ref="textarea"
            />
        </div>;

        var items_display = (
                <WorksheetItemList
                    ref={"list"}
                    active={this.state.activeComponent=='list'}
                    canEdit={canEdit}
                    saveAndUpdateWorksheet={this.saveAndUpdateWorksheet}
                    toggleEditMode={this.toggleEditMode}
                    toggleActionBar={this.toggleActionBar}
                    hideActionBar={this.hideActionBar}
                    updateWorksheetFocusIndex={this._setfocusIndex}
                    updateWorksheetSubFocusIndex={this._setWorksheetSubFocusIndex}
                    showActionBar={this.showActionBar}
                    refreshWorksheet={this.refreshWorksheet}
                />
            )

        var action_bar_display = (
                <WorksheetActionBar
                    ref={"action"}
                    canEdit={this.canEdit()}
                    handleFocus={this.handleActionBarFocus}
                    handleBlur={this.handleActionBarBlur}
                    active={this.state.activeComponent=='action'}
                    show={this.state.showActionBar}
                    focusIndex={this.state.focusIndex}
                    subFocusIndex={this.state.subFocusIndex}
                    refreshWorksheet={this.refreshWorksheet}
                    editMode={this.editMode}
                />
            )

        var worksheet_side_panel = null;
        if(ws_obj.state.items.length){
            worksheet_side_panel = (
                <WorksheetSidePanel
                    ref={"panel"}
                    active={this.state.activeComponent=='side_panel'}
                    focusIndex={this.state.focusIndex}
                    subFocusIndex={this.state.subFocusIndex}
                />
            )
        }

        var upload_modal = (
                <UploadModal
                    ref={"modal"}
                    refreshWorksheet={this.refreshWorksheet}
                />
            )

        var worksheet_modal = (
                <BootstrapModal
                    ref={"modal"}
                />
            )

        var worksheet_display = this.state.editMode ? raw_display : items_display;

        return (
            <div id="worksheet" className={serachClassName}>
                {action_bar_display}
                <div id="worksheet_panel" className="actionbar-focus">
                    {worksheet_side_panel}
                    <div className="ws-container">
                        <div className="container-fluid">
                            <div id="worksheet_content" className={editableClassName}>
                                <div className="header-row">
                                    <div className="row">
                                        <h4 className="worksheet-title">{ws_obj.state.title}</h4>
                                        <div className="col-sm-6 col-md-8">
                                            <div className="worksheet-icon"></div>
                                            <div className="worksheet-name">
                                                <div className="worksheet-detail">Name: {ws_obj.state.name}</div>
                                                <div className="worksheet-detail">Owner: {ws_obj.state.owner}</div>
                                                <div className="worksheet-detail">Permission: {permission_str}</div>
                                            </div>
                                        </div>
                                        <div className="col-sm-6 col-md-4">
                                            <div className="controls">
                                                <a href="#" data-toggle="modal" data-target="#glossaryModal" className="glossary-link"><code>?</code> Keyboard Shortcuts</a>
                                                {editFeatures}
                                            </div>
                                        </div>
                                    </div>
                                    <hr />
                                </div>
                                {worksheet_display}
                            </div>
                        </div>
                        {worksheet_modal}
                        {upload_modal}
                    </div>
                </div>
                <div id="dragbar_vertical" className="dragbar"></div>
            </div>
        )
    }
});

var worksheet_react = <Worksheet />;
React.render(worksheet_react, document.getElementById('worksheet_container'));
