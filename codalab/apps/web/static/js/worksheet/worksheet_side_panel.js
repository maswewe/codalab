/** @jsx React.DOM */
var WorksheetSidePanel = React.createClass({
    focustype: 'worksheet', // worksheet, bundle or None
    getInitialState: function(){
        return {
        };
    },
    debouncedFetchExtra: undefined,
    componentDidMount: function(e){
        var self = this;
        $('#dragbar_vertical').mousedown(function(e){
            self.resizePanel(e);
        });
        $(document).mouseup(function(e){
            $(this).unbind('mousemove');
        });
        $(window).resize(function(e){
            self.resetPanel();
        });
    },
    capture_keys: function(){
        Mousetrap.bind(['shift+up', 'shift+k'], function(e){
            var node = this.getDOMNode();
            var nodetop = $(node).scrollTop() // get all measurements for node rel to current viewport
            $(node).stop(true).animate({scrollTop: nodetop-100}, 45);
        }.bind(this), 'keydown');
        Mousetrap.bind(['shift+down', 'shift+j'], function(e){
            var node = this.getDOMNode();
            var nodetop = $(node).scrollTop() // get all measurements for node rel to current viewport
            $(node).stop(true).animate({scrollTop: nodetop+100}, 45);
        }.bind(this), 'keydown');
    },
    _fetch_extra: function(){
        if(this.refs.hasOwnProperty('bundle_info_side_panel')){
            this.refs.bundle_info_side_panel.fetch_extra();
        }
    },
    componentDidUpdate:function(){
        this.capture_keys();
        var self = this;
        if(this.debouncedFetchExtra === undefined){
            // debounce it to wait for user to stop for X time.
            this.debouncedFetchExtra = _.debounce(self._fetch_extra, 1500).bind(this);
        }
        //set up the wait for fetching extra
        this.debouncedFetchExtra();

        // update the child if bundle
        if(this.focustype == 'bundle'){
            var current_focus = this.current_focus();
            var subFocusIndex = this.props.subFocusIndex;
            var bundle_info;
            if(current_focus.bundle_info instanceof Array){ //tables are arrays
                bundle_info = current_focus.bundle_info[this.props.subFocusIndex]
            }else{ // content/images/ect. are not
                bundle_info = current_focus.bundle_info
            }
            if(this.refs.hasOwnProperty('bundle_info_side_panel')){ // just to double check so no errors
                this.refs.bundle_info_side_panel.setState(bundle_info);
            }
        }

    },
    current_focus: function(){
        var focus = undefined;
        if(this.props.focusIndex > -1){
            focus = ws_obj.state.items[this.props.focusIndex].state;
            if(focus.mode == "markup"){
                this.focustype = '';
                focus = undefined;
                return focus;
            }
            if(focus.mode == "worksheet" || focus.mode == "search"){
                this.focustype = 'worksheet';
                if(focus.mode != "worksheet"){ // are we not looking at a sub worksheet
                     //for lets default it back to showing the main worksheet info
                     focus = ws_obj.state;
                }
            }else{
                this.focustype = 'bundle';
            }// end of if focus.modes
        }else{// there is no focus index, just show the worksheet infomation
            focus = ws_obj.state;
            this.focustype = 'worksheet';
        }
        return  focus;
    },
    resizePanel: function(e){
        e.preventDefault();
        $(document).mousemove(function(e){
            var windowWidth = $(window).width();
            var panelWidth = windowWidth - e.pageX;
            var panelWidthPercentage = (windowWidth - e.pageX) / windowWidth * 100;
            console.log('########')
            console.log(panelWidth);
            console.log(panelWidthPercentage);
            if(240 < panelWidth && panelWidthPercentage < 55){
                $('.ws-container').css('width', e.pageX);
                $('.ws-panel').css('width', panelWidthPercentage + '%');
                $('#dragbar_vertical').css('right', panelWidthPercentage + '%');
            }
        });
    },
    resetPanel: function(){
        var windowWidth = $(window).width();
        if(windowWidth < 768){
            $('.ws-container').removeAttr('style');
        }else {
            var panelWidth = parseInt($('.ws-panel').css('width'));
            var containerWidth = windowWidth - panelWidth;
            $('.ws-container').css('width', containerWidth);
        }
    },
    render: function(){
        var current_focus = this.current_focus();
        var side_panel_details = ''
        switch (this.focustype) {
            case 'worksheet':
                side_panel_details = <WorksheetDetailSidePanel
                                        key={'ws' + this.props.focusIndex}
                                        item={current_focus}
                                        ref="worksheet_info_side_panel"
                                    />
                break;
            case 'bundle':
                // TODO TODO set bundle detail state
                side_panel_details = <BundleDetailSidePanel
                                        key={this.props.focusIndex + this.props.subFocusIndex}
                                        item={current_focus}
                                        subFocusIndex={this.props.subFocusIndex}
                                        ref="bundle_info_side_panel"
                                    />
                break;
            default:
                break;
        }


        return (
            <div className="ws-panel">
                {side_panel_details}
            </div>
        )
    }
});



/** @jsx React.DOM */
var WorksheetDetailSidePanel = React.createClass({
    getInitialState: function(){
        return { };
    },
    componentDidMount: function(){

    },
    componentWillUnmount: function(){

    },
    render: function(){
        var worksheet = this.props.item;
        if(worksheet.hasOwnProperty('subworksheet_info')){
            // are we looking at a sub worksheet. lets get the correct worksheet data.
            worksheet = worksheet.subworksheet_info;
        }
        var bundles_html = ''
        var bundles_table = [];
        // helper function for showing all bundles.
        var bundle_push = function(b){
            var b_url =  "/bundles/" + b.uuid;
            var short_uuid = b.uuid.slice(0,8);
            bundles_table.push(
                <tr>
                    <td>
                        {b.metadata.name}
                    </td>
                    <td>
                        <a href={b_url}>{short_uuid}</a>
                    </td>
                </tr>
            );
        }

        worksheet.items = worksheet.items || []; // check if even exists if not create empty
        if(worksheet.items.length){
            worksheet.items.forEach(function(item, i){
                var bundle = null;
                var bundle_info = null;
                if(item.state.hasOwnProperty('bundle_info') && item.state.bundle_info){
                   bundle_info = item.state.bundle_info;
                   if(Array.isArray(bundle_info)){
                        bundle_info.forEach(function(bi, i){
                            if(bi.hasOwnProperty('data_hash')){
                                bundle_push(bi);
                            }
                        });
                   }else{
                        bundle_push(bundle_info);
                   }
                }
            }) // end of foreach

            bundles_html = (
                <div className="bundles-table">
                    <h4>Bundles</h4>
                    <table className="bundle-meta table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>UUID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bundles_table}
                        </tbody>
                    </table>
                </div>
            )
        }// end of this.state.dependencies.length


        var permission_str = "you(" + ws_obj.state.permission_str + ") "
        worksheet.group_permissions = worksheet.group_permissions || []; // check if even exists if not create empty
        worksheet.group_permissions.forEach(function(perm) {
            permission_str = permission_str + " " + perm.group_name + "(" + perm.permission_str + ") "
        });
        return (
            <div id="panel_content">
                <h3 className="ws-name">{worksheet.name}</h3>
                <p className="ws-uuid">{worksheet.uuid}</p>
                <p className="ws-owner">{worksheet.owner}</p>
                <p className="ws-permissions">Permissions: {permission_str}</p>
                {bundles_html}
            </div>
        )
    }
});



var BundleDetailSidePanel = React.createClass({
    getInitialState: function(){
        //set the state from the props and leave props.item alone
        var item = this.props.item;
        var bundle_info;
        if(item.bundle_info instanceof Array){ //tables are arrays
            bundle_info = item.bundle_info[this.props.subFocusIndex];
        }else{ // content/images/ect. are not
            bundle_info = item.bundle_info;
        }

        bundle_info.host_worksheets   = bundle_info.host_worksheets || [];
        bundle_info.dependencies      = bundle_info.dependencies || [];
        bundle_info.group_permissions = bundle_info.group_permissions || [];
        bundle_info.stdout = bundle_info.stdout || null;
        bundle_info.stderr = bundle_info.stderr || null;
        return bundle_info;
    },
    fetch_extra: function(){ // grab detailed infomation about this bundle info.
        var bundle_info = this.state;
        ws_bundle_obj.state = bundle_info;
        //break out if we don't match. The user has moved on.
        if(ws_bundle_obj.current_uuid == bundle_info.uuid){
            return;
        }
        console.log(bundle_info.uuid);
        //update we are at the correct focus.
        ws_bundle_obj.current_uuid = bundle_info.uuid;
        ws_bundle_obj.fetch({
            success: function(data){
                console.log("BundleDetailSidePanel fetch  success");
                // do a check since this fires async to double check users intent.
                if(ws_bundle_obj.current_uuid == bundle_info.uuid){
                    console.log("UPDATE ***");
                    if(this.isMounted()){
                        this.setState(data)
                    }
                }
            }.bind(this),
            error: function(xhr, status, err) {
                console.error(ws_obj.url, status, err);
            }.bind(this)
        });

    },
    componentDidMount: function(){},
    componentWillUnmount: function(){},
    render: function(){
        var bundle_info = this.state;
        var bundle_url = '/bundles/' + bundle_info.uuid;
        var bundle_download_url = "/bundles/" + bundle_info.uuid + "/download";
        var bundle_name;
        if(bundle_info.metadata.name){
            bundle_name = <h3 className="bundle-name">{ bundle_info.metadata.name }</h3>
        }
        var bundle_state_class = 'bundle-state state-' + (bundle_info.state || 'ready')
        var bundle_description = bundle_info.metadata.description ? <p className="bundle-description">{bundle_info.metadata.description}</p> : ''

        // setup various parts of the side panel.
        /// ------------------------------------------------------------------
        var dependencies = bundle_info.dependencies
        var dependencies_table = []
        var dep_bundle_url = ''
        var dependencies_html = ''
        if(dependencies.length){
            dependencies.forEach(function(dep, i){
                dep_bundle_url = "/bundles/" + dep.parent_uuid;
                dependencies_table.push(
                    <tr>
                        <td>
                            {dep.child_path}
                        </td>
                        <td>
                            <a href={dep_bundle_url}>{dep.parent_uuid}</a>
                        </td>
                    </tr>
                )
            }) // end of foreach

            dependencies_html = (
                <div className="dependencies-table">
                    <h4>Dependencies</h4>
                    <table className="bundle-meta table">
                        <thead>
                            <tr>
                                <th>Path</th>
                                <th>UUID</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dependencies_table}
                        </tbody>
                    </table>
                </div>
            )
        }// end of this.state.dependencies.length

        var metadata = bundle_info.metadata
        var metadata_list_html = [];
        // lets sort the metadata by key
        var keys = []
        var property; // we will reuse this.
        for (property in metadata){
            if (metadata.hasOwnProperty(property)){
                keys.push(property);
            }
        }
        keys.sort(); // sorted, lets get them in the proper order
        for (var i = 0; i < keys.length; i++){
            property = keys[i]; //set to current property
            if (metadata.hasOwnProperty(property)) {
                metadata_list_html.push(
                    <tr>
                        <th>
                            {property}
                        </th>
                        <td>
                            <span >
                                {metadata[property]}
                            </span>
                        </td>
                    </tr>
                )
            }
        }// end of for(var i keys.len)


        var stdout_html = ''
        if(bundle_info.stdout){
            //had to add span since react elm must be wrapped
            stdout_html = (
                <span>
                    <h4>stdout</h4>
                    <div className="bundle-meta">
                        <pre>
                            {bundle_info.stdout}
                        </pre>
                    </div>
                </span>
            )
        }
        var stderr_html = ''
        if(bundle_info.stderr){
            //had to add span since react elm must be wrapped
            stderr_html = (
                <span>
                    <h4>stderr</h4>
                    <div className="bundle-meta">
                        <pre>
                            {bundle_info.stderr}
                        </pre>
                    </div>
                </span>
            )
        }
        var host_worksheets_html = ''
        if(bundle_info.host_worksheets){
            if(bundle_info.host_worksheets.length){
                var host_worksheets_url = ''
                host_worksheets_rows = []
                bundle_info.host_worksheets.forEach(function(worksheet, i){
                    host_worksheets_url = "/worksheets/" + worksheet.uuid;
                    host_worksheets_rows.push(
                        <tr>
                            <td>
                                {worksheet.name}
                            </td>
                            <td>
                                <a href={host_worksheets_url}>{worksheet.uuid}</a>
                            </td>
                        </tr>
                    );
                }) // end of foreach
                host_worksheets_html = (
                            <div className="host-worksheets-table">
                                <h4>Host Worksheets</h4>
                                <table className="bundle-meta table">
                                    <thead>
                                        <tr>
                                            <th width="40%">Name</th>
                                            <th width="60%">UUID</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {host_worksheets_rows}
                                    </tbody>
                                </table>
                            </div>
                )
            }
        }// end of if host_worksheets

        var group_permissions_html = ''
        if(bundle_info.edit_permission){
            if(bundle_info.group_permissions.length){
                group_permissions_rows = []
                bundle_info.group_permissions.forEach(function(group, i){
                    group_permissions_rows.push(
                        <tr>
                            <td>
                                {group.group_name}
                            </td>
                            <td>
                               {group.group_uuid}
                            </td>
                            <td>
                               {group.permission_str}
                            </td>
                        </tr>
                    );
                }) // end of foreach
                group_permissions_html = (
                            <div className="row">
                                <div className="col-sm-10">
                                    <div className="dependencies-table">
                                        <table id="dependencies_table" >
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>UUID</th>
                                                    <th>Permissions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group_permissions_rows}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                )
            } // end of if group_permissions.len
        }// end of if edit.permission
        /// ------------------------------------------------------------------
        // put it all together.
        return (
            <div id="panel_content">
                <div className="bundle-header">
                    {bundle_name}
                    <div className="bundle-links">
                        <a href={bundle_url} className="bundle-link" target="_blank">{bundle_info.uuid}</a>
                        <a href={bundle_download_url} className="bundle-download btn btn-default btn-sm" alt="Download Bundle">
                            <span className="glyphicon glyphicon-download-alt"></span>
                        </a>
                    </div>
                    { bundle_description }
                </div>
                <table className="bundle-meta table">
                    <tbody>
                        <tr>
                            <th>
                                state:
                            </th>
                            <td>
                                <span className={bundle_state_class}>
                                    {bundle_info.state || 'ready'}
                                </span>
                            </td>
                        </tr>
                        <tr>
                            <th>
                                command:
                            </th>
                            <td>
                                {bundle_info.command || "<none>"}
                            </td>
                        </tr>
                    </tbody>
                </table>
                <h4>metadata </h4>
                <table className="bundle-meta table">
                    <tbody>
                        {metadata_list_html}
                    </tbody>
                </table>
                {dependencies_html}
                {host_worksheets_html}
                {stdout_html}
                {stderr_html}
            </div>
        )
    }
});