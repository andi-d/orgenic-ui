/**
 * ORGENIC-UI
 * @license MIT
 * See LICENSE file at https://github.com/orgenic/orgenic-ui/blob/master/LICENSE
 **/

import {
    h,
    Component,
    Prop,
    EventEmitter,
    Event,
    State,
    Element,
    Listen,
    Watch,
    Host
} from '@stencil/core';
import { OgCalendarDate, OgDateDecorator } from '../og-internal-calendar/interfaces/og-calendar-date-decorator';
import { CalendarUtils } from '../og-internal-calendar/utils/utils';
import moment from 'moment';
import { loadMomentLocale, getDefaultLocale } from '../../utils/moment-locale-loader';

@Component({
    tag: 'og-datepicker',
    styleUrl: 'og-datepicker.scss',
    shadow: true
})
export class OgDatepicker {
    @Element() el: HTMLElement;

    @Prop({ context: 'resourcesUrl' }) resourcesUrl!: string;

    /**
     * Optional placeholder if no value is selected.
     */
    @Prop() placeholder?: string;

    /**
     * Locale for this datepicker (country code in ISO 3166 format)
     */
    @Prop() loc = getDefaultLocale();

    /**
     * The selected value of the combobox
     */
    @Prop({ mutable: true, reflectToAttr: true }) value: string;
    @Watch('value') setValue(newValue: string) {
        if (typeof newValue === 'string') {
            moment.locale(this.loc);
            const lmoment = moment(newValue, this.format);
            this.internalValue = CalendarUtils.moment2CalendarDate(lmoment);
        }
    }

    /**
     * Defines the date string format. The value will be parsed and emitted using this format.
     */
    @Prop() format: string = 'DD.MM.YYYY';
    @Watch('format') setFormat() {
        this.setValue(this.value);
    }

    /**
     * The date decorator can be used to highlight special dates like public holidays or meetings.
     */
    @Prop() dateDecorator: OgDateDecorator;

    /**
     * Determines, whether the control is disabled or not
     */
    @Prop() disabled: boolean;

    /**
     * Event is being emitted when selected date changes.
     */
    @Event() dateSelected: EventEmitter<any>;

    /**
     * Event is being emitted when input gets focus..
     */
    @Event() focusGained: EventEmitter<FocusEvent>;

    /**
     * Event is being emitted when focus gets lost.
     */
    @Event() focusLost: EventEmitter<FocusEvent>;

    @State() dropdownActive: boolean = false;

    @Listen('scroll', { target: 'window' })
    handleWindowScroll(_ev: Event) {
        // close flyout on scroll events
        this.dropdownActive = false;
        this.focusLost.emit();
    }

    @Listen('scroll', { target: 'body' })
    handleBodyScroll(_ev: Event) {
        // close flyout on scroll events
        this.dropdownActive = false;
        this.focusLost.emit();
    }

    @Listen('click', { target: 'body' })
    handleBodyClick(ev: Event) {
        if (!this.dropdownActive || this.el === ev.target) {
            return;
        }
        if (this.dropdownActive) {
            this.dropdownActive = false;
            ev.cancelBubble = true;
            this.focusLost.emit();
        }
    }

    @State()
    private internalValue: OgCalendarDate;

    indicatorElement: HTMLElement;
    flyoutCalendar: HTMLElement;

    async componentWillLoad() {
        await loadMomentLocale(this.loc, moment);
        this.setValue(this.value);
    }

    componentDidLoad() {
        this.setValue(this.value);
    }

    buttonClicked() {
        if (!this.disabled) {
            this.dropdownActive = !this.dropdownActive;
            if (this.dropdownActive) {
                this.focusGained.emit();
            } else {
                this.focusLost.emit();
            }
        }
    }

    handleDateClicked(event) {
        event.cancelBubble = true;

        if (!this.disabled) {
            const date: OgCalendarDate = event.detail;

            this.dropdownActive = false;
            this.internalValue = date;
            this.value = CalendarUtils.calendarDate2Moment(date, this.loc).format(this.format);
            this.dateSelected.emit(CalendarUtils.calendarDate2Moment(date, this.loc).toDate());
            this.focusLost.emit();
        }
    }

    private isDropdownActive(): boolean {
        return this.dropdownActive && !this.disabled;
    }

    /**
     * behaviour:
     *   * combobox flyout shows 7 items
     *   * if it does not fit on screen, scale down flyout
     *   * if flyout would be smaller than 4 items, show flyout above combobox
     */
    getFlyoutCss() {
        if (!this.indicatorElement) {
            return {};
        }

        let flyoutTop = (this.indicatorElement.getBoundingClientRect().top + this.indicatorElement.offsetHeight);

        this.flyoutCalendar.style.display = 'block';
        let flyoutHeight = this.flyoutCalendar.getBoundingClientRect().height;
        this.flyoutCalendar.style.display = '';

        if (flyoutTop + flyoutHeight > window.innerHeight) {
            flyoutTop = this.el.getBoundingClientRect().top - flyoutHeight;
        }

        return {
            top: Math.max(0, flyoutTop) + 'px',
        }
    }

    render() {
        return (
            <Host class={{ 'og-form-item__editor': true, 'is-focused': this.dropdownActive }}>
                <div
                    class="og-datepicker__header"
                    onClick={() => this.buttonClicked()}
                >
                    <input
                        type="text"
                        class="og-datepicker__input"
                        readonly="true"
                        value={ !this.internalValue ? '' : CalendarUtils.calendarDate2Moment(this.internalValue, this.loc).format(this.format) }
                        placeholder={this.placeholder}
                        disabled={this.disabled}
                    />
                    <div class="og-datepicker__button">
                        <svg
                            class={
                                'og-datepicker__button__arrow' +
                                (this.isDropdownActive() ? ' og-datepicker__button__arrow--collapsed' : '')
                            }
                            version="1.1"
                            xmlns="http://www.w3.org/2000/svg"
                            xmlnsXlink="http://www.w3.org/1999/xlink"
                            viewBox="0 0 24 12"
                            preserveAspectRatio="none"
                        >
                            <polyline
                                class="og-datepicker__button__arrow__line"
                                points="0,0 12,12 24,0"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecaps="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </div>
                    <div class="og-datepicker__indicator" ref={(el) => this.indicatorElement = el} />
                </div>
                <div class="og-datepicker__flyout">
                    <og-calendar
                        class={
                            'og-datepicker__flyout__calendar' +
                            (this.isDropdownActive() ? ' og-datepicker__flyout__calendar--visible' : '')
                        }
                        style={ this.getFlyoutCss() }
                        ref={(el) => this.flyoutCalendar = el}
                        year={ !this.internalValue ? undefined : this.internalValue.year }
                        month={ !this.internalValue ? undefined : this.internalValue.month }
                        loc={ this.loc }
                        dateDecorator={ this.dateDecorator }
                        selection={ !this.internalValue ? [] : [ this.internalValue ] }
                        selectionType="single"
                        onDateClicked={ (e) => this.handleDateClicked(e) }>
                    </og-calendar>
                </div>
            </Host>
        );
    }
}
