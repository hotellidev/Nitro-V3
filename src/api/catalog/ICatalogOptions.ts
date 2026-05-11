import { ClubGiftInfoParser, MarketplaceConfigurationMessageParser } from '@nitrots/nitro-renderer';

export interface ICatalogOptions
{
    clubGifts?: ClubGiftInfoParser;
    marketplaceConfiguration?: MarketplaceConfigurationMessageParser;
}
