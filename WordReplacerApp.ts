import { IAppAccessors, ILogger, IConfigurationExtend, IConfigurationModify, IEnvironmentRead, IRead, IHttp, IMessageBuilder, IPersistence } from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IMessage, IPreMessageSentModify } from '@rocket.chat/apps-engine/definition/messages';
//import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata/IAppInfo';
import { SettingType } from '@rocket.chat/apps-engine/definition/settings/SettingType';
import { ISetting } from '@rocket.chat/apps-engine/definition/settings/ISetting';
//import { SettingType, ISetting } from '@rocket.chat/apps-engine/definition/settings';

export class WordReplacerApp extends App  implements IPreMessageSentModify {
    private filters;

    constructor(info: IAppInfo, logger: ILogger, accessors: IAppAccessors) {
        super(info, logger, accessors);
        this.filters = [];
    }

    public async onEnable(environment: IEnvironmentRead, _configurationModify: IConfigurationModify): Promise<boolean> {
        const metaFilters = await environment.getSettings().getValueById('filters') as string;
        return this.parseConfig(metaFilters);
    }

    public async onSettingUpdated(setting: ISetting, _configurationModify: IConfigurationModify, _read: IRead, _http: IHttp): Promise<void> {
        if (setting.id !== 'filters') {
            return;
        }
        this.parseConfig(setting.value);
    }

    protected async extendConfiguration(configuration: IConfigurationExtend, _environmentRead: IEnvironmentRead): Promise<void> {
        await configuration.settings.provideSetting({
            id: 'filters',
            type: SettingType.STRING,
            packageValue: '[{"search": "#(\\\\d+)", "replace": "[$&](https://www1.example.com/issues/$1)"}, {"search": "BUG-(\\\\d+)", "replace": "[$&](https://www2.example.com/issues/$1)", "flags": "gi"}]',
            required: true,
            public: false,
            multiline: true,
            i18nLabel: 'WordReplacerApp_Filters',
            i18nDescription: 'WordReplacerApp_Filters_Description',
        });
    }

    public async checkPreMessageSentModify?(message: IMessage, _read: IRead, _http: IHttp): Promise<boolean> {
        return typeof message.text === 'string';
    }

    public async executePreMessageSentModify(message: IMessage, builder: IMessageBuilder, _read: IRead, _http: IHttp, _persistence: IPersistence): Promise<IMessage> {
        let text = message.text || '';

        Object.keys(this.filters).forEach((key) => {
            const filter = this.filters[key] || {};
            text = text.replace(new RegExp(filter.search || '', filter.flags || 'gi'), filter.replace || '');
        });

        return builder.setText(text).getMessage();
    }

    private parseConfig(text: string) {
        let newFilters = [];
        try {
            newFilters = JSON.parse(text);
            this.filters = newFilters;
            return true;
        } catch (e) {
            return false;
        }
    }
}
