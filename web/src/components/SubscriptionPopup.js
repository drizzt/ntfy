import * as React from 'react';
import {useContext, useState} from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import {InputAdornment, Portal, Snackbar, useMediaQuery} from "@mui/material";
import theme from "./theme";
import subscriptionManager from "../app/SubscriptionManager";
import DialogFooter from "./DialogFooter";
import {useTranslation} from "react-i18next";
import accountApi, {Permission, UnauthorizedError} from "../app/AccountApi";
import session from "../app/Session";
import routes from "./routes";
import ReserveTopicSelect from "./ReserveTopicSelect";
import MenuItem from "@mui/material/MenuItem";
import PopupMenu from "./PopupMenu";
import {formatShortDateTime, shuffle} from "../app/utils";
import api from "../app/Api";
import {useNavigate} from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import {Clear} from "@mui/icons-material";
import {AccountContext} from "./App";
import {ReserveEditDialog, ReserveAddDialog, ReserveDeleteDialog} from "./ReserveDialogs";

const SubscriptionPopup = (props) => {
    const { t } = useTranslation();
    const { account } = useContext(AccountContext);
    const navigate = useNavigate();
    const [displayNameDialogOpen, setDisplayNameDialogOpen] = useState(false);
    const [reserveAddDialogOpen, setReserveAddDialogOpen] = useState(false);
    const [reserveEditDialogOpen, setReserveEditDialogOpen] = useState(false);
    const [reserveDeleteDialogOpen, setReserveDeleteDialogOpen] = useState(false);
    const [showPublishError, setShowPublishError] = useState(false);
    const subscription = props.subscription;
    const placement = props.placement ?? "left";
    const reservations = account?.reservations || [];

    const showReservationAdd = !subscription?.reservation && account?.stats.reservations_remaining > 0;
    const showReservationAddDisabled = !subscription?.reservation && account?.stats.reservations_remaining === 0;
    const showReservationEdit = !!subscription?.reservation;
    const showReservationDelete = !!subscription?.reservation;

    const handleChangeDisplayName = async () => {
        setDisplayNameDialogOpen(true);
    }

    const handleReserveAdd = async () => {
        setReserveAddDialogOpen(true);
    }

    const handleReserveEdit = async () => {
        setReserveEditDialogOpen(true);
    }

    const handleReserveDelete = async () => {
        setReserveDeleteDialogOpen(true);
    }

    const handleSendTestMessage = async () => {
        const baseUrl = props.subscription.baseUrl;
        const topic = props.subscription.topic;
        const tags = shuffle([
            "grinning", "octopus", "upside_down_face", "palm_tree", "maple_leaf", "apple", "skull", "warning", "jack_o_lantern",
            "de-server-1", "backups", "cron-script", "script-error", "phils-automation", "mouse", "go-rocks", "hi-ben"])
            .slice(0, Math.round(Math.random() * 4));
        const priority = shuffle([1, 2, 3, 4, 5])[0];
        const title = shuffle([
            "",
            "",
            "", // Higher chance of no title
            "Oh my, another test message?",
            "Titles are optional, did you know that?",
            "ntfy is open source, and will always be free. Cool, right?",
            "I don't really like apples",
            "My favorite TV show is The Wire. You should watch it!",
            "You can attach files and URLs to messages too",
            "You can delay messages up to 3 days"
        ])[0];
        const nowSeconds = Math.round(Date.now()/1000);
        const message = shuffle([
            `Hello friend, this is a test notification from ntfy web. It's ${formatShortDateTime(nowSeconds)} right now. Is that early or late?`,
            `So I heard you like ntfy? If that's true, go to GitHub and star it, or to the Play store and rate it. Thanks! Oh yeah, this is a test notification.`,
            `It's almost like you want to hear what I have to say. I'm not even a machine. I'm just a sentence that Phil typed on a random Thursday.`,
            `Alright then, it's ${formatShortDateTime(nowSeconds)} already. Boy oh boy, where did the time go? I hope you're alright, friend.`,
            `There are nine million bicycles in Beijing That's a fact; It's a thing we can't deny. I wonder if that's true ...`,
            `I'm really excited that you're trying out ntfy. Did you know that there are a few public topics, such as ntfy.sh/stats and ntfy.sh/announcements.`,
            `It's interesting to hear what people use ntfy for. I've heard people talk about using it for so many cool things. What do you use it for?`
        ])[0];
        try {
            await api.publish(baseUrl, topic, message, {
                title: title,
                priority: priority,
                tags: tags
            });
        } catch (e) {
            console.log(`[ActionBar] Error publishing message`, e);
            setShowPublishError(true);
        }
    }

    const handleClearAll = async () => {
        console.log(`[ActionBar] Deleting all notifications from ${props.subscription.id}`);
        await subscriptionManager.deleteNotifications(props.subscription.id);
    };

    const handleUnsubscribe = async (event) => {
        console.log(`[ActionBar] Unsubscribing from ${props.subscription.id}`, props.subscription);
        await subscriptionManager.remove(props.subscription.id);
        if (session.exists() && props.subscription.remoteId) {
            try {
                await accountApi.deleteSubscription(props.subscription.remoteId);
            } catch (e) {
                console.log(`[ActionBar] Error unsubscribing`, e);
                if ((e instanceof UnauthorizedError)) {
                    session.resetAndRedirect(routes.login);
                }
            }
        }
        const newSelected = await subscriptionManager.first(); // May be undefined
        if (newSelected && !newSelected.internal) {
            navigate(routes.forSubscription(newSelected));
        } else {
            navigate(routes.app);
        }
    };

    return (
        <>
            <PopupMenu
                horizontal={placement}
                anchorEl={props.anchor}
                open={!!props.anchor}
                onClose={props.onClose}
            >
                <MenuItem onClick={handleChangeDisplayName}>{t("action_bar_change_display_name")}</MenuItem>
                {showReservationAdd && <MenuItem onClick={handleReserveAdd}>{t("action_bar_reservation_add")}</MenuItem>}
                {showReservationAddDisabled && <MenuItem disabled={true}>{t("action_bar_reservation_add")}</MenuItem>}
                {showReservationEdit && <MenuItem onClick={handleReserveEdit}>{t("action_bar_reservation_edit")}</MenuItem>}
                {showReservationDelete && <MenuItem onClick={handleReserveDelete}>{t("action_bar_reservation_delete")}</MenuItem>}
                <MenuItem onClick={handleSendTestMessage}>{t("action_bar_send_test_notification")}</MenuItem>
                <MenuItem onClick={handleClearAll}>{t("action_bar_clear_notifications")}</MenuItem>
                <MenuItem onClick={handleUnsubscribe}>{t("action_bar_unsubscribe")}</MenuItem>
            </PopupMenu>
            <Portal>
                <Snackbar
                    open={showPublishError}
                    autoHideDuration={3000}
                    onClose={() => setShowPublishError(false)}
                    message={t("message_bar_error_publishing")}
                />
                <DisplayNameDialog
                    open={displayNameDialogOpen}
                    subscription={subscription}
                    onClose={() => setDisplayNameDialogOpen(false)}
                />
                {showReservationAdd &&
                    <ReserveAddDialog
                        open={reserveAddDialogOpen}
                        topic={subscription.topic}
                        reservations={reservations}
                        onClose={() => setReserveAddDialogOpen(false)}
                    />
                }
                {showReservationEdit &&
                    <ReserveEditDialog
                        open={reserveEditDialogOpen}
                        reservation={subscription.reservation}
                        reservations={props.reservations}
                        onClose={() => setReserveEditDialogOpen(false)}
                    />
                }
                {showReservationDelete &&
                    <ReserveDeleteDialog
                        open={reserveDeleteDialogOpen}
                        topic={subscription.topic}
                        onClose={() => setReserveDeleteDialogOpen(false)}
                    />
                }
            </Portal>
        </>
    );
};

const DisplayNameDialog = (props) => {
    const { t } = useTranslation();
    const subscription = props.subscription;
    const [displayName, setDisplayName] = useState(subscription.displayName ?? "");
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const handleSave = async () => {
        // Apply locally
        await subscriptionManager.setDisplayName(subscription.id, displayName);

        // Apply remotely
        if (session.exists() && subscription.remoteId) {
            try {
                console.log(`[SubscriptionSettingsDialog] Updating subscription display name to ${displayName}`);
                await accountApi.updateSubscription(subscription.remoteId, { display_name: displayName });
            } catch (e) {
                console.log(`[SubscriptionSettingsDialog] Error updating subscription`, e);
                if ((e instanceof UnauthorizedError)) {
                    session.resetAndRedirect(routes.login);
                }

                // FIXME handle 409
            }
        }
        props.onClose();
    }

    return (
        <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth fullScreen={fullScreen}>
            <DialogTitle>{t("display_name_dialog_title")}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {t("display_name_dialog_description")}
                </DialogContentText>
                <TextField
                    autoFocus
                    placeholder={t("display_name_dialog_placeholder")}
                    value={displayName}
                    onChange={ev => setDisplayName(ev.target.value)}
                    type="text"
                    fullWidth
                    variant="standard"
                    inputProps={{
                        maxLength: 64,
                        "aria-label": t("display_name_dialog_placeholder")
                    }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton onClick={() => setDisplayName("")} edge="end">
                                    <Clear/>
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                />
            </DialogContent>
            <DialogFooter>
                <Button onClick={props.onClose}>{t("common_cancel")}</Button>
                <Button onClick={handleSave}>{t("common_save")}</Button>
            </DialogFooter>
        </Dialog>
    );
};

export default SubscriptionPopup;
