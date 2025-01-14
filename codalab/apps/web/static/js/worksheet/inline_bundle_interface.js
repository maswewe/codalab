/** @jsx React.DOM */

var InlineBundle = React.createClass({
    mixins: [CheckboxMixin],
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
        var className = 'type-inline' + (this.props.focused ? ' focused' : '');
        var checkbox = this.props.canEdit ? <input type="checkbox" className="ws-checkbox" onChange={this.handleCheck} checked={this.state.checked} disabled={!this.props.checkboxEnabled}/> : null;
        return(
            <div className="ws-item" onClick={this.handleClick}>
                {checkbox}
                <div className={className}>
                    <em>
                        {this.state.interpreted}
                    </em>
                </div>
            </div>
        );
    } // end of render function
}); //end of  InlineBundle
