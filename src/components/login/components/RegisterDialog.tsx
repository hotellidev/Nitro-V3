import { FC, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { GetConfiguration } from '@nitrots/nitro-renderer';
import { GetConfigurationValue } from '../../../api';
import { TurnstileWidget } from '../TurnstileWidget';
import { t } from '../utils/i18n';
import {
    buildFigureString,
    buildImagingUrl,
    buildPartPreviewUrl,
    EMAIL_REGEX,
    FALLBACK_DEFAULTS,
    FALLBACK_HEX,
    FigureData,
    FigureSelection,
    GenderKey,
    PART_ROWS
} from '../utils/figure';
import { DialogSharedProps } from './shared';

export interface RegisterDialogProps extends DialogSharedProps
{
    onSubmit: (body: { username: string; email: string; password: string; figure: string; gender: string; turnstileToken: string; templateId: number | null; }, onDialogReset: () => void) => void;
    onCheckEmail: (email: string) => Promise<{ available: boolean; error?: string }>;
    onCheckUsername: (username: string) => Promise<{ available: boolean; error?: string }>;
    onCheckServer: () => Promise<boolean>;
    imagingUrl: string;
    roomTemplatesUrl: string;
}

type RegisterStep = 'credentials' | 'avatar' | 'room';

interface RoomTemplate { templateId: number; title: string; description: string; thumbnail: string; }

export const RegisterDialog: FC<RegisterDialogProps> = props =>
{
    const { onCancel, onSubmit, onCheckEmail, onCheckUsername, onCheckServer, imagingUrl, roomTemplatesUrl, submitting, error, info, turnstileEnabled, turnstileSiteKey } = props;

    const [ step, setStep ] = useState<RegisterStep>('credentials');
    const [ email, setEmail ] = useState('');
    const [ password, setPassword ] = useState('');
    const [ confirm, setConfirm ] = useState('');
    const [ username, setUsername ] = useState('');
    const [ gender, setGender ] = useState<GenderKey>('F');
    const [ selection, setSelection ] = useState<FigureSelection>(() => ({ ...FALLBACK_DEFAULTS.F }));
    const [ localError, setLocalError ] = useState<string | null>(null);
    const [ checking, setChecking ] = useState(false);
    const [ turnstileToken, setTurnstileToken ] = useState('');
    const [ resetSignal, setResetSignal ] = useState(0);
    const [ serverReachable, setServerReachable ] = useState<boolean | null>(null);
    const [ pingingServer, setPingingServer ] = useState(false);

    const pingServer = useCallback(async () =>
    {
        setPingingServer(true);
        try
        {
            const ok = await onCheckServer();
            setServerReachable(ok);
            return ok;
        }
        finally
        {
            setPingingServer(false);
        }
    }, [ onCheckServer ]);

    useEffect(() =>
    {
        let cancelled = false;
        (async () =>
        {
            const ok = await onCheckServer();
            if(!cancelled) setServerReachable(ok);
        })();
        return () =>
        {
            cancelled = true;
        };
    }, [ onCheckServer ]);

    const resetWidget = useCallback(() =>
    {
        setTurnstileToken('');
        setResetSignal(prev => prev + 1);
    }, []);

    useEffect(() =>
    {
        setLocalError(null);
    }, [ step ]);

    const [ roomTemplates, setRoomTemplates ] = useState<RoomTemplate[] | null>(null);
    const [ roomTemplatesError, setRoomTemplatesError ] = useState<string | null>(null);
    const [ selectedTemplateId, setSelectedTemplateId ] = useState<number | null>(null);

    const [ figureData, setFigureData ] = useState<FigureData | null>(null);
    const figureDataUrlRaw = GetConfigurationValue<string>('avatar.figuredata.url', '');
    const figureDataUrl = useMemo(() =>
    {
        if(!figureDataUrlRaw) return '';
        try
        {
            return GetConfiguration().interpolate(figureDataUrlRaw);
        }
        catch
        {
            return figureDataUrlRaw;
        }
    }, [ figureDataUrlRaw ]);

    useEffect(() =>
    {
        if(step !== 'avatar' || figureData || !figureDataUrl) return;
        let cancelled = false;
        fetch(figureDataUrl, { credentials: 'omit' })
            .then(r => r.ok ? r.json() : null)
            .then(json =>
            {
                if(!cancelled && json) setFigureData(json as FigureData);
            })
            .catch(() =>
            { });
        return () =>
        {
            cancelled = true;
        };
    }, [ step, figureData, figureDataUrl ]);

    useEffect(() =>
    {
        if(step !== 'room' || roomTemplates !== null || !roomTemplatesUrl) return;
        let cancelled = false;
        setRoomTemplatesError(null);
        fetch(roomTemplatesUrl, { credentials: 'include' })
            .then(async r =>
            {
                if(!r.ok) throw new Error(`status ${ r.status }`);
                return r.json();
            })
            .then(json =>
            {
                if(cancelled) return;
                const list = Array.isArray((json as { templates?: unknown })?.templates)
                    ? (json as { templates: RoomTemplate[] }).templates
                    : [];
                setRoomTemplates(list);
            })
            .catch(() =>
            {
                if(cancelled) return;
                setRoomTemplates([]);
                setRoomTemplatesError(t('nitro.login.register.room.error', 'Could not load room options. You can still skip this step.'));
            });
        return () =>
        {
            cancelled = true;
        };
    }, [ step, roomTemplates, roomTemplatesUrl ]);

    const partOptions = useMemo(() =>
    {
        const result: Record<string, Record<GenderKey, number[]>> = {};
        if(!figureData) return result;
        for(const st of figureData.setTypes)
        {
            if(!PART_ROWS.includes(st.type)) continue;
            const forGender = (g: GenderKey) => st.sets
                .filter(s => s.selectable && s.club === 0 && (s.gender === g || s.gender === 'U'))
                .map(s => s.id);
            result[st.type] = { M: forGender('M'), F: forGender('F') };
        }
        return result;
    }, [ figureData ]);

    const paletteOptions = useMemo(() =>
    {
        const result: Record<string, { id: number; hex: string }[]> = {};
        if(!figureData) return result;
        for(const st of figureData.setTypes)
        {
            if(!PART_ROWS.includes(st.type)) continue;
            const palette = figureData.palettes.find(p => p.id === st.paletteId);
            if(!palette)
            {
                result[st.type] = []; continue;
            }
            result[st.type] = palette.colors
                .filter(c => c.selectable && c.club === 0)
                .map(c => ({ id: c.id, hex: '#' + c.hexCode.toUpperCase() }));
        }
        return result;
    }, [ figureData ]);

    const hexFor = useCallback((setType: string, colorId: number): string =>
    {
        const list = paletteOptions[setType];
        if(list)
        {
            const found = list.find(c => c.id === colorId);
            if(found) return found.hex;
        }
        return FALLBACK_HEX[colorId] || '#c9c9c9';
    }, [ paletteOptions ]);

    const [ hotLooks, setHotLooks ] = useState<{ gender: GenderKey; figure: string }[]>([]);
    const [ hotLookIndex, setHotLookIndex ] = useState(-1);

    useEffect(() =>
    {
        if(step !== 'avatar' || hotLooks.length) return;
        let cancelled = false;
        fetch('hotlooks.json', { credentials: 'omit' })
            .then(r => r.ok ? r.json() : null)
            .then((json: unknown) =>
            {
                if(cancelled || !Array.isArray(json)) return;
                const parsed: { gender: GenderKey; figure: string }[] = [];
                for(const entry of json as Record<string, unknown>[])
                {
                    const rawGender = typeof entry._gender === 'string' ? entry._gender.toUpperCase() : '';
                    const figure = typeof entry._figure === 'string' ? entry._figure : '';
                    if((rawGender !== 'M' && rawGender !== 'F') || !figure) continue;
                    parsed.push({ gender: rawGender, figure });
                }
                if(parsed.length) setHotLooks(parsed);
            })
            .catch(() =>
            { });
        return () =>
        {
            cancelled = true;
        };
    }, [ step, hotLooks.length ]);

    const applyLook = useCallback((figure: string, lookGender: GenderKey) =>
    {
        const next: FigureSelection = {};
        for(const setPart of figure.split('.'))
        {
            const bits = setPart.split('-');
            if(bits.length < 2) continue;
            const setType = bits[0];
            const partId = parseInt(bits[1], 10);
            if(!setType || Number.isNaN(partId)) continue;
            const colors: number[] = [];
            for(let i = 2; i < bits.length; i++)
            {
                const c = parseInt(bits[i], 10);
                if(!Number.isNaN(c)) colors.push(c);
            }
            next[setType] = { partId, colors };
        }

        for(const setType of PART_ROWS)
        {
            if(!next[setType]) next[setType] = { ...FALLBACK_DEFAULTS[lookGender][setType] };
        }
        setGender(lookGender);
        setSelection(next);
    }, []);

    const cycleHotLook = useCallback(() =>
    {
        if(!hotLooks.length) return;
        const nextIdx = (hotLookIndex + 1) % hotLooks.length;
        setHotLookIndex(nextIdx);
        const look = hotLooks[nextIdx];
        applyLook(look.figure, look.gender);
    }, [ hotLooks, hotLookIndex, applyLook ]);

    const credentialsValid =
        EMAIL_REGEX.test(email.trim()) &&
        password.length >= 8 &&
        password === confirm;

    const handleCredentialsNext = async (event: FormEvent<HTMLFormElement>) =>
    {
        event.preventDefault();
        setLocalError(null);

        if(!email.trim() || !password || !confirm)
        {
            setLocalError(t('nitro.login.error.missing_fields', 'Please fill in every field.'));
            return;
        }
        if(!EMAIL_REGEX.test(email.trim()))
        {
            setLocalError(t('nitro.login.error.invalid_email', 'Please enter a valid email address.'));
            return;
        }
        if(password.length < 8)
        {
            setLocalError(t('nitro.login.error.password_too_short', 'Your password must be at least 8 characters.'));
            return;
        }
        if(password !== confirm)
        {
            setLocalError(t('nitro.login.error.password_mismatch', 'Passwords do not match.'));
            return;
        }

        setChecking(true);
        try
        {
            const serverOk = await pingServer();
            if(!serverOk)
            {
                setLocalError(t('nitro.login.error.server_offline', 'The gameserver is not running. Please try again later.'));
                return;
            }
            const result = await onCheckEmail(email.trim());
            if(!result.available)
            {
                setLocalError(result.error || t('nitro.login.error.email_taken', 'This email is already in use.'));
                return;
            }
            setStep('avatar');
        }
        finally
        {
            setChecking(false);
        }
    };

    const applyGender = (newGender: GenderKey) =>
    {
        setGender(newGender);
        setSelection({ ...FALLBACK_DEFAULTS[newGender] });
        setHotLookIndex(-1);
    };

    const getPartList = useCallback((setType: string): number[] =>
    {
        const loaded = partOptions[setType]?.[gender];
        if(loaded && loaded.length) return loaded;
        const fallback = FALLBACK_DEFAULTS[gender][setType]?.partId;
        return fallback !== undefined ? [ fallback ] : [];
    }, [ partOptions, gender ]);

    const getColorList = useCallback((setType: string): number[] =>
    {
        const loaded = paletteOptions[setType];
        if(loaded && loaded.length) return loaded.map(c => c.id);
        const fallback = FALLBACK_DEFAULTS[gender][setType]?.colors?.[0];
        return fallback !== undefined ? [ fallback ] : [];
    }, [ paletteOptions, gender ]);

    const cyclePart = (setType: string, direction: 1 | -1) =>
    {
        const options = getPartList(setType);
        if(!options.length) return;
        const current = selection[setType]?.partId ?? options[0];
        const idx = options.indexOf(current);
        const nextIdx = ((idx === -1 ? 0 : idx) + direction + options.length) % options.length;
        const colors = getColorList(setType);
        setSelection(prev => ({
            ...prev,
            [setType]: {
                partId: options[nextIdx],
                colors: prev[setType]?.colors ?? [ colors[0] ?? 0 ]
            }
        }));
    };

    const cycleColor = (setType: string, direction: 1 | -1) =>
    {
        const colors = getColorList(setType);
        if(!colors.length) return;
        const currentColor = selection[setType]?.colors?.[0] ?? colors[0];
        const idx = colors.indexOf(currentColor);
        const nextIdx = ((idx === -1 ? 0 : idx) + direction + colors.length) % colors.length;
        const parts = getPartList(setType);
        setSelection(prev => ({
            ...prev,
            [setType]: {
                partId: prev[setType]?.partId ?? parts[0],
                colors: [ colors[nextIdx] ]
            }
        }));
    };

    const figure = buildFigureString(selection);
    const previewSrc = buildImagingUrl(imagingUrl, figure, gender);

    const handleAvatarSubmit = async (event: FormEvent<HTMLFormElement>) =>
    {
        event.preventDefault();
        setLocalError(null);

        const trimmed = username.trim();
        if(!trimmed)
        {
            setLocalError(t('nitro.login.error.missing_username', 'Please choose a Habbo name.'));
            return;
        }
        if(trimmed.length < 3 || trimmed.length > 16)
        {
            setLocalError(t('nitro.login.error.username_length', 'Habbo name must be 3–16 characters.'));
            return;
        }

        if(turnstileEnabled && !turnstileToken)
        {
            setLocalError(t('nitro.login.error.turnstile', 'Please complete the security check.'));
            return;
        }

        setChecking(true);
        try
        {
            const serverOk = await pingServer();
            if(!serverOk)
            {
                setLocalError(t('nitro.login.error.server_offline', 'The gameserver is not running. Please try again later.'));
                return;
            }
            const result = await onCheckUsername(trimmed);
            if(!result.available)
            {
                setLocalError(result.error || t('nitro.login.error.username_taken', 'This Habbo name is already taken.'));
                return;
            }
        }
        finally
        {
            setChecking(false);
        }

        setStep('room');
    };

    const submitRegistration = (templateId: number | null) =>
    {
        onSubmit({
            username: username.trim(),
            email: email.trim(),
            password,
            figure,
            gender,
            turnstileToken,
            templateId
        }, resetWidget);
    };

    const handleRoomSubmit = (event: FormEvent<HTMLFormElement>) =>
    {
        event.preventDefault();
        setLocalError(null);
        submitRegistration(selectedTemplateId);
    };

    const busy = submitting || checking || pingingServer;
    const serverOffline = serverReachable === false;

    return (
        <div className="nitro-login-modal">
            <div className={ `dialog ${ step === 'avatar' ? 'dialog-avatar' : '' } ${ step === 'room' ? 'dialog-room' : '' }` }>
                <div className="nitro-login-card">
                    <div className="card-title">
                        <span>{ t('nitro.login.register.title', 'Habbo Details') }</span>
                        <span className="nitro-card-close-button" role="button" aria-label={ t('generic.close', 'Close') } onClick={ onCancel } />
                    </div>

                    { step === 'credentials' &&
                        <form className="card-body" onSubmit={ handleCredentialsNext } autoComplete="on">
                            <div className="register-intro">
                                { t('nitro.login.register.intro.credentials', 'Let\'s create your account. Enter your email and pick a password — we\'ll check that email isn\'t already in use.') }
                            </div>
                            { serverOffline &&
                                <div className="error-line server-offline">
                                    { t('nitro.login.server.offline.long', 'The gameserver isn\'t running right now, so new accounts can\'t be created. Please try again in a moment.') }
                                    <button type="button" className="retry-link" onClick={ pingServer } disabled={ pingingServer }>
                                        { pingingServer ? t('nitro.login.server.checking', 'Checking…') : t('nitro.login.server.retry', 'Retry') }
                                    </button>
                                </div>
                            }
                            <div className="field">
                                <label htmlFor="register-email">{ t('register.email', 'Email') }</label>
                                <input id="register-email" type="email" maxLength={ 120 } autoComplete="email"
                                    value={ email } onChange={ e => setEmail(e.target.value) } />
                            </div>
                            <div className="field">
                                <label htmlFor="register-password">{ t('generic.password', 'Password') }</label>
                                <input id="register-password" type="password" maxLength={ 128 } autoComplete="new-password"
                                    value={ password } onChange={ e => setPassword(e.target.value) } />
                            </div>
                            <div className="field">
                                <label htmlFor="register-confirm">{ t('nitro.login.register.confirm.label', 'Confirm password') }</label>
                                <input id="register-confirm" type="password" maxLength={ 128 } autoComplete="new-password"
                                    value={ confirm } onChange={ e => setConfirm(e.target.value) } />
                            </div>
                            { (localError || error) && <div className="error-line">{ localError || error }</div> }
                            { info && <div className="info-line">{ info }</div> }
                            <div className="step-footer">
                                <span className="step-indicator">1/3</span>
                                <button type="submit" className="ok-button" disabled={ !credentialsValid || busy || serverOffline }>
                                    { checking || pingingServer ? t('nitro.login.server.checking', 'Checking…') : t('nitro.login.register.next', 'Next') }
                                </button>
                            </div>
                        </form>
                    }

                    { step === 'avatar' &&
                        <form className="card-body" onSubmit={ handleAvatarSubmit } autoComplete="on">
                            <div className="register-intro">
                                { t('nitro.login.register.intro.avatar', 'Now it\'s time to make your own Habbo character! To make your own Habbo, please start by choosing your Habbo Name.') }
                            </div>
                            { serverOffline &&
                                <div className="error-line server-offline">
                                    { t('nitro.login.server.offline.long', 'The gameserver isn\'t running right now, so new accounts can\'t be created. Please try again in a moment.') }
                                    <button type="button" className="retry-link" onClick={ pingServer } disabled={ pingingServer }>
                                        { pingingServer ? t('nitro.login.server.checking', 'Checking…') : t('nitro.login.server.retry', 'Retry') }
                                    </button>
                                </div>
                            }
                            <div className="field">
                                <input id="register-username" type="text" maxLength={ 16 } autoComplete="username" placeholder={ t('nitro.login.register.username.placeholder', 'HabboName') }
                                    value={ username } onChange={ e => setUsername(e.target.value) } />
                            </div>

                            <div className="gender-row">
                                <label>
                                    <input type="radio" name="register-gender" checked={ gender === 'F' } onChange={ () => applyGender('F') } />
                                    <span>{ t('avatareditor.generic.girl', 'Girl') }</span>
                                </label>
                                <label>
                                    <input type="radio" name="register-gender" checked={ gender === 'M' } onChange={ () => applyGender('M') } />
                                    <span>{ t('avatareditor.generic.boy', 'Boy') }</span>
                                </label>
                            </div>

                            <div className="avatar-builder">
                                <div className="avatar-part-col">
                                    { PART_ROWS.map(setType =>
                                    {
                                        const partPreviewSrc = buildPartPreviewUrl(imagingUrl, setType, selection, gender);
                                        return (
                                            <div className="avatar-part-row" key={ `part-${ setType }` }>
                                                <button type="button" className="arrow-btn" aria-label={ `Previous ${ setType }` }
                                                    onClick={ () => cyclePart(setType, -1) }>&lsaquo;</button>
                                                <div className={ `part-preview part-preview-${ setType }` }>
                                                    <img src={ partPreviewSrc } alt={ `${ setType } preview` } onError={ e =>
                                                    {
                                                        (e.currentTarget).style.visibility = 'hidden';
                                                    } } />
                                                </div>
                                                <button type="button" className="arrow-btn" aria-label={ `Next ${ setType }` }
                                                    onClick={ () => cyclePart(setType, 1) }>&rsaquo;</button>
                                            </div>
                                        );
                                    }) }
                                </div>

                                <div className="avatar-preview">
                                    <img src={ previewSrc } alt="Habbo preview" onError={ e =>
                                    {
                                        (e.currentTarget).style.visibility = 'hidden';
                                    } } />
                                </div>

                                <div className="avatar-color-col">
                                    { PART_ROWS.map(setType =>
                                    {
                                        const fallbackColor = FALLBACK_DEFAULTS[gender][setType]?.colors?.[0] ?? 0;
                                        const currentColor = selection[setType]?.colors?.[0] ?? fallbackColor;
                                        const swatchHex = hexFor(setType, currentColor);
                                        return (
                                            <div className="avatar-color-row" key={ `color-${ setType }` }>
                                                <button type="button" className="arrow-btn" aria-label={ `Previous color ${ setType }` }
                                                    onClick={ () => cycleColor(setType, -1) }>&lsaquo;</button>
                                                <div className="color-swatch" style={ { background: swatchHex } } />
                                                <button type="button" className="arrow-btn" aria-label={ `Next color ${ setType }` }
                                                    onClick={ () => cycleColor(setType, 1) }>&rsaquo;</button>
                                            </div>
                                        );
                                    }) }
                                </div>
                            </div>

                            <div className="hot-looks-row">
                                <button type="button" className="ok-button hot-looks-button"
                                    onClick={ cycleHotLook }
                                    disabled={ !hotLooks.length || busy }
                                    title={ hotLooks.length
                                        ? t('nitro.login.register.hotlooks.count', '%count% looks available', [ 'count' ], [ String(hotLooks.length) ])
                                        : t('nitro.login.register.hotlooks.none', 'No hot looks loaded') }>
                                    { t('avatareditor.category.hotlooks', 'Hot Looks') }{ hotLookIndex >= 0 && hotLooks.length ? ` (${ hotLookIndex + 1 }/${ hotLooks.length })` : '' }
                                </button>
                            </div>

                            { turnstileEnabled &&
                                <TurnstileWidget
                                    siteKey={ turnstileSiteKey }
                                    size="compact"
                                    onToken={ setTurnstileToken }
                                    onExpire={ () => setTurnstileToken('') }
                                    onError={ () => setTurnstileToken('') }
                                    resetSignal={ resetSignal }
                                /> }
                            { (localError || error) && <div className="error-line">{ localError || error }</div> }
                            { info && <div className="info-line">{ info }</div> }

                            <div className="step-footer step-footer-split">
                                <button type="button" className="ok-button back-button" onClick={ () => setStep('credentials') } disabled={ busy }>{ t('generic.back', 'Back') }</button>
                                <span className="step-indicator">2/3</span>
                                <button type="submit" className="ok-button" disabled={ !username.trim() || busy || serverOffline }>
                                    { (checking || pingingServer) ? t('nitro.login.server.checking', 'Checking…') : t('nitro.login.register.next', 'Next') }
                                </button>
                            </div>
                        </form>
                    }

                    { step === 'room' &&
                        <form className="card-body" onSubmit={ handleRoomSubmit } autoComplete="off">
                            <div className="register-intro">
                                { t('nitro.login.register.intro.room', 'Last step — pick a starter room, or skip and create your own later.') }
                            </div>
                            { serverOffline &&
                                <div className="error-line server-offline">
                                    { t('nitro.login.server.offline.long', 'The gameserver isn\'t running right now, so new accounts can\'t be created. Please try again in a moment.') }
                                    <button type="button" className="retry-link" onClick={ pingServer } disabled={ pingingServer }>
                                        { pingingServer ? t('nitro.login.server.checking', 'Checking…') : t('nitro.login.server.retry', 'Retry') }
                                    </button>
                                </div>
                            }

                            <div className="room-templates-list">
                                <label className={ `room-template-option room-template-skip ${ selectedTemplateId === null ? 'selected' : '' }` }>
                                    <input type="radio" name="register-room-template" checked={ selectedTemplateId === null }
                                        onChange={ () => setSelectedTemplateId(null) } />
                                    <div className="room-template-body">
                                        <div className="room-template-title">{ t('nitro.login.register.room.skip.title', 'I\'m okay — I\'ll create my own rooms') }</div>
                                        <div className="room-template-description">{ t('nitro.login.register.room.skip.description', 'Skip for now and start with an empty hotel inventory.') }</div>
                                    </div>
                                </label>

                                { roomTemplates === null && <div className="info-line">{ t('nitro.login.register.room.loading', 'Loading rooms…') }</div> }

                                { roomTemplates !== null && roomTemplates.map(template => (
                                    <label key={ template.templateId }
                                        className={ `room-template-option ${ selectedTemplateId === template.templateId ? 'selected' : '' }` }>
                                        <input type="radio" name="register-room-template" checked={ selectedTemplateId === template.templateId }
                                            onChange={ () => setSelectedTemplateId(template.templateId) } />
                                        { template.thumbnail &&
                                            <img className="room-template-thumb" src={ template.thumbnail } alt={ template.title }
                                                onError={ e =>
                                                {
                                                    (e.currentTarget).style.visibility = 'hidden';
                                                } } /> }
                                        <div className="room-template-body">
                                            <div className="room-template-title">{ template.title }</div>
                                            { template.description &&
                                                <div className="room-template-description">{ template.description }</div> }
                                        </div>
                                    </label>
                                )) }
                            </div>

                            { roomTemplatesError && <div className="error-line">{ roomTemplatesError }</div> }
                            { (localError || error) && <div className="error-line">{ localError || error }</div> }
                            { info && <div className="info-line">{ info }</div> }

                            <div className="step-footer step-footer-split">
                                <button type="button" className="ok-button back-button" onClick={ () => setStep('avatar') } disabled={ busy }>{ t('generic.back', 'Back') }</button>
                                <span className="step-indicator">3/3</span>
                                <button type="submit" className="ok-button" disabled={ busy || serverOffline }>
                                    { submitting ? t('nitro.login.register.creating', 'Creating…') : t('nitro.login.register.finish', 'Finish') }
                                </button>
                            </div>
                        </form>
                    }
                </div>
            </div>
        </div>
    );
};
