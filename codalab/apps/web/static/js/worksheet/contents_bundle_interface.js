/** @jsx React.DOM */

var ContentsBundle = React.createClass({
    mixins: [CheckboxMixin, GoToBundleMixin],
    getInitialState: function(){
        this.props.item.state.checked = false;
        return this.props.item.state;
    },
    handleClick: function(event){
        var index = this.props.index;
        var last_sub_el = undefined;
        var direction = undefined;
        var scroll = false;
        this.props.setFocus(this.props.index, event, last_sub_el, direction, scroll);
    },
    render: function() {
        var className = 'type-contents' + (this.props.focused ? ' focused' : '');
        var checkbox = this.props.canEdit ? <input type="checkbox" className="ws-checkbox" onChange={this.handleCheck} checked={this.state.checked} disabled={!this.props.checkboxEnabled} /> : null;
        var contents = this.state.interpreted.map(function(item) {
            return item.replace(/%\s/, '');  // TODO: why removing %?
        });
        contents = contents.join('');
        // TODO: make this a monospace font
        // contents = contents.replace(/%\s/g, '');
        return(
            <div className="ws-item" onClick={this.handleClick}>
                {checkbox}
                <div className={className} ref={this.props.item.state.ref}>
                    <blockquote>
                        <p dangerouslySetInnerHTML={{__html: contents}} />
                    </blockquote>
                </div>
            </div>
        );
    } // end of render function
}); //end of  ContentsBundle
