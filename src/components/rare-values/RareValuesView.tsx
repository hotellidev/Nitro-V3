import { AddLinkEventTracker, GetRoomEngine, GetSessionDataManager, ILinkEventTracker, IRareValue, IWheelAdminPrize, IWheelAdminPrizeEdit, RemoveLinkEventTracker } from '@nitrots/nitro-renderer';
import { FC, useEffect, useMemo, useState } from 'react';
import { LocalizeFormattedNumber, LocalizeText } from '../../api';
import { Column, Flex, LayoutCurrencyIcon, LayoutImage, Text } from '../../common';
import { useFortuneWheel, useHasPermission, useRareValues } from '../../hooks';
import { NitroCard, NitroInput } from '../../layout';

interface RareValueRow
{
    spriteId: number;
    name: string;
    iconUrl: string;
    value: IRareValue;
}

interface EditRow
{
    id: number;
    category: string;
    num: number;
    weight: number;
    label: string;
}

const CATEGORIES: { key: string; label: string }[] = [
    { key: 'item', label: 'Raro (ID)' },
    { key: 'diamanti', label: 'Diamanti' },
    { key: 'duckets', label: 'Duckets' },
    { key: 'crediti', label: 'Crediti' },
    { key: 'giri', label: 'Giri extra' },
    { key: 'nulla', label: 'Nulla' }
];

const prizeToCategory = (prize: IWheelAdminPrize): string =>
{
    switch(prize.type)
    {
        case 'item': return 'item';
        case 'points': return (prize.pointsType === 5) ? 'diamanti' : 'duckets';
        case 'credits': return 'crediti';
        case 'spin': return 'giri';
        default: return 'nulla';
    }
};

const prizeToNum = (prize: IWheelAdminPrize): number =>
    (prize.type === 'item') ? (parseInt(prize.value) || 0) : prize.amount;

const rowToEdit = (row: EditRow): IWheelAdminPrizeEdit =>
{
    const base = { id: row.id, weight: row.weight, label: row.label };

    switch(row.category)
    {
        case 'item': return { ...base, type: 'item', value: String(row.num), amount: 1, pointsType: 0 };
        case 'diamanti': return { ...base, type: 'points', value: '', amount: row.num, pointsType: 5 };
        case 'duckets': return { ...base, type: 'points', value: '', amount: row.num, pointsType: 0 };
        case 'crediti': return { ...base, type: 'credits', value: '', amount: row.num, pointsType: 0 };
        case 'giri': return { ...base, type: 'spin', value: '', amount: row.num, pointsType: 0 };
        default: return { ...base, type: 'nothing', value: '', amount: 0, pointsType: 0 };
    }
};

export const RareValuesView: FC<{}> = () =>
{
    const [ isVisible, setIsVisible ] = useState(false);
    const [ tab, setTab ] = useState<'values' | 'editor'>('values');
    const [ searchValue, setSearchValue ] = useState('');
    const { values = null, loaded = false } = useRareValues();
    const { adminPrizes = [], loadAdminPrizes = null, saveAdminPrizes = null } = useFortuneWheel();
    const canEdit = useHasPermission('acc_supporttool');
    const [ editRows, setEditRows ] = useState<EditRow[]>([]);

    useEffect(() =>
    {
        const linkTracker: ILinkEventTracker = {
            linkReceived: (url: string) =>
            {
                const parts = url.split('/');
                if(parts.length < 2) return;

                switch(parts[1])
                {
                    case 'show': setIsVisible(true); return;
                    case 'hide': setIsVisible(false); return;
                    case 'toggle': setIsVisible(prev => !prev); return;
                }
            },
            eventUrlPrefix: 'rare-values/',
        };

        AddLinkEventTracker(linkTracker);

        return () => RemoveLinkEventTracker(linkTracker);
    }, []);

    useEffect(() =>
    {
        if(isVisible && (tab === 'editor') && canEdit && loadAdminPrizes) loadAdminPrizes();
    }, [ isVisible, tab, canEdit, loadAdminPrizes ]);

    useEffect(() =>
    {
        setEditRows(adminPrizes.map(prize => ({ id: prize.id, category: prizeToCategory(prize), num: prizeToNum(prize), weight: prize.weight, label: prize.label })));
    }, [ adminPrizes ]);

    const rows = useMemo<RareValueRow[]>(() =>
    {
        if(!values) return [];

        const list: RareValueRow[] = [];

        values.forEach((value, spriteId) =>
        {
            if(value.points <= 0) return;

            const floorData = GetSessionDataManager().getFloorItemData(spriteId);
            const wallData = floorData ? null : GetSessionDataManager().getWallItemData(spriteId);
            const data = (floorData ?? wallData);

            if(!data) return;

            const iconUrl = (floorData
                ? GetRoomEngine().getFurnitureFloorIconUrl(spriteId)
                : GetRoomEngine().getFurnitureWallIconUrl(spriteId));

            list.push({ spriteId, name: (data.name || data.className || `#${ spriteId }`), iconUrl, value });
        });

        list.sort((a, b) => (b.value.points - a.value.points));

        return list;
    }, [ values ]);

    const filtered = useMemo<RareValueRow[]>(() =>
    {
        const query = searchValue.trim().toLocaleLowerCase();

        if(!query) return rows;

        return rows.filter(row => row.name.toLocaleLowerCase().includes(query));
    }, [ rows, searchValue ]);

    if(!isVisible) return null;

    const updateRow = (id: number, patch: Partial<EditRow>) =>
        setEditRows(prev => prev.map(row => (row.id === id) ? { ...row, ...patch } : row));

    return (
        <NitroCard className="w-[420px] h-[480px]" uniqueKey="rare-values">
            <NitroCard.Header
                headerText={ LocalizeText('rarevalues.title') }
                onCloseClick={ () => setIsVisible(false) } />
            { canEdit &&
                <NitroCard.Tabs>
                    <NitroCard.TabItem isActive={ tab === 'values' } onClick={ () => setTab('values') }>
                        <Text>{ LocalizeText('rarevalues.title') }</Text>
                    </NitroCard.TabItem>
                    <NitroCard.TabItem isActive={ tab === 'editor' } onClick={ () => setTab('editor') }>
                        <Text>{ LocalizeText('rarevalues.editor.tab') }</Text>
                    </NitroCard.TabItem>
                </NitroCard.Tabs> }
            <NitroCard.Content>
                { (tab === 'values' || !canEdit) &&
                    <Column gap={ 2 } className="h-full p-1">
                        <NitroInput
                            placeholder={ LocalizeText('generic.search') }
                            value={ searchValue }
                            onChange={ event => setSearchValue(event.target.value) } />
                        <Column gap={ 0 } overflow="auto" className="grow">
                            { !loaded &&
                                <Text center className="mt-2 text-black/60">{ LocalizeText('rarevalues.loading') }</Text> }
                            { (loaded && !filtered.length) &&
                                <Text center className="mt-2 text-black/60">{ LocalizeText('rarevalues.empty') }</Text> }
                            { filtered.map(row => (
                                <Flex key={ row.spriteId } alignItems="center" gap={ 2 } className="border-b border-black/10 py-1.5 hover:bg-black/5">
                                    <LayoutImage imageUrl={ row.iconUrl } className="h-10 w-10 shrink-0 bg-contain bg-center bg-no-repeat" />
                                    <Text truncate className="grow text-[#1f2d34]">{ row.name }</Text>
                                    <Flex alignItems="center" gap={ 1 } className="shrink-0">
                                        <Text bold textEnd className="text-[#2f6f95]">{ LocalizeFormattedNumber(row.value.points) }</Text>
                                        <LayoutCurrencyIcon type={ row.value.pointsType } />
                                    </Flex>
                                </Flex>
                            )) }
                        </Column>
                    </Column> }

                { (tab === 'editor' && canEdit) &&
                    <Column gap={ 1 } className="h-full p-1">
                        <Flex gap={ 1 } className="px-1 text-[11px] font-bold text-black/60">
                            <span className="w-28">{ LocalizeText('rarevalues.editor.type') }</span>
                            <span className="w-16">{ LocalizeText('rarevalues.editor.value') }</span>
                            <span className="w-12">{ LocalizeText('rarevalues.editor.weight') }</span>
                            <span className="grow">{ LocalizeText('rarevalues.editor.label') }</span>
                        </Flex>
                        <Column gap={ 1 } overflow="auto" className="grow">
                            { editRows.map(row => (
                                <Flex key={ row.id } alignItems="center" gap={ 1 } className="border-b border-black/10 pb-1">
                                    <select
                                        value={ row.category }
                                        onChange={ event => updateRow(row.id, { category: event.target.value }) }
                                        className="w-28 rounded border border-black/20 bg-white px-1 py-0.5 text-sm text-[#1f2d34]">
                                        { CATEGORIES.map(cat => <option key={ cat.key } value={ cat.key }>{ cat.label }</option>) }
                                    </select>
                                    <input
                                        type="number"
                                        value={ row.num }
                                        disabled={ row.category === 'nulla' }
                                        onChange={ event => updateRow(row.id, { num: parseInt(event.target.value) || 0 }) }
                                        className="w-16 rounded border border-black/20 bg-white px-1 py-0.5 text-sm text-[#1f2d34] disabled:opacity-40" />
                                    <input
                                        type="number"
                                        value={ row.weight }
                                        onChange={ event => updateRow(row.id, { weight: parseInt(event.target.value) || 0 }) }
                                        className="w-12 rounded border border-black/20 bg-white px-1 py-0.5 text-sm text-[#1f2d34]" />
                                    <input
                                        type="text"
                                        value={ row.label }
                                        onChange={ event => updateRow(row.id, { label: event.target.value }) }
                                        className="min-w-0 grow rounded border border-black/20 bg-white px-1 py-0.5 text-sm text-[#1f2d34]" />
                                </Flex>
                            )) }
                        </Column>
                        <button
                            type="button"
                            onClick={ () => saveAdminPrizes?.(editRows.map(rowToEdit)) }
                            className="cursor-pointer rounded bg-[#3a7bb5] px-4 py-2 font-bold text-white hover:bg-[#336ea3]">
                            { LocalizeText('rarevalues.editor.save') }
                        </button>
                    </Column> }
            </NitroCard.Content>
        </NitroCard>
    );
};
